from django.test import SimpleTestCase

from plugins.snt_malaria.services.ai_chat import build_message, extract_json_text
from plugins.snt_malaria.services.ai_chat.messages import append_turn, build_conversation


ATTACHMENT = {"file_id": "file_abc123", "filename": "report.pdf"}


class BuildMessageTestCase(SimpleTestCase):
    def test_text_only_message_has_single_text_block(self):
        message = build_message("user", "hello")

        self.assertEqual(message["role"], "user")
        self.assertEqual(message["content"], [{"type": "text", "text": "hello"}])

    def test_attachment_produces_document_block_before_text(self):
        message = build_message("user", "summarize this", attachments=[ATTACHMENT])

        self.assertEqual(
            message["content"],
            [
                {
                    "type": "document",
                    "source": {"type": "file", "file_id": "file_abc123"},
                    "title": "report.pdf",
                    "cache_control": {"type": "ephemeral"},
                },
                {"type": "text", "text": "summarize this"},
            ],
        )

    def test_multiple_attachments_each_produce_a_document_block(self):
        message = build_message(
            "user",
            "compare these",
            attachments=[{"file_id": "file_1", "filename": "a.pdf"}, {"file_id": "file_2", "filename": "b.pdf"}],
        )

        self.assertEqual(len(message["content"]), 3)
        self.assertEqual(message["content"][0]["source"]["file_id"], "file_1")
        self.assertEqual(message["content"][1]["source"]["file_id"], "file_2")


class BuildConversationTestCase(SimpleTestCase):
    def test_history_entries_keep_their_own_attachments(self):
        history = [
            {"role": "user", "content": "summarize this", "attachments": [ATTACHMENT]},
            {"role": "assistant", "content": "Done."},
        ]

        messages = build_conversation("and now this", history)

        self.assertEqual(len(messages), 3)
        self.assertEqual(messages[0]["content"][0]["source"]["file_id"], "file_abc123")
        self.assertEqual(messages[1]["content"], [{"type": "text", "text": "Done."}])
        self.assertEqual(messages[2]["content"], [{"type": "text", "text": "and now this"}])


class AppendTurnTestCase(SimpleTestCase):
    def test_turn_without_attachments_has_no_attachments_key(self):
        history = append_turn([], "hello", "hi there")

        self.assertEqual(history, [{"role": "user", "content": "hello"}, {"role": "assistant", "content": "hi there"}])

    def test_attachments_are_carried_on_the_user_entry(self):
        history = append_turn([], "summarize", "Here's a summary.", [ATTACHMENT])

        self.assertEqual(history[0]["attachments"], [ATTACHMENT])

    def test_existing_history_is_not_mutated(self):
        original = [{"role": "user", "content": "first"}]

        append_turn(original, "second", "reply")

        self.assertEqual(len(original), 1)


class ExtractJsonTextTestCase(SimpleTestCase):
    def test_bare_json_is_returned_as_is(self):
        self.assertEqual(extract_json_text('{"message": "hi"}'), '{"message": "hi"}')

    def test_json_fence_is_stripped(self):
        self.assertEqual(extract_json_text('```json\n{"message": "hi"}\n```'), '{"message": "hi"}')

    def test_plain_fence_is_stripped(self):
        self.assertEqual(extract_json_text('```\n{"message": "hi"}\n```'), '{"message": "hi"}')

    def test_leading_conversational_text_is_dropped(self):
        self.assertEqual(extract_json_text('You\'re right - {"message": "hi"}'), '{"message": "hi"}')

    def test_trailing_remark_after_json_is_dropped(self):
        # The composite-layer variant of this helper handled a trailing remark on an otherwise
        # unfenced object; the scenario-rule one bailed out whenever the text already started with
        # "{" and left the remark in, which then failed to parse.
        self.assertEqual(extract_json_text('{"message": "hi"} Let me know!'), '{"message": "hi"}')

    def test_text_with_no_json_object_is_returned_unchanged(self):
        self.assertEqual(extract_json_text("Which data layer did you mean?"), "Which data layer did you mean?")
