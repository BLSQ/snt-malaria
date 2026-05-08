from rest_framework.throttling import AnonRateThrottle


class SNTAccountThrottle(AnonRateThrottle):
    scope = "snt_public_account"
