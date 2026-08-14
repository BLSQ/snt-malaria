import {
    clamp,
    computeFitScale,
    dispatchPan,
    dispatchWheel,
    getStageElement,
    measureNodeSizes,
    MIN_SCALE,
    readStageTransform,
    shiftGraphForRemount,
} from './flumeStage';

describe('clamp', () => {
    it('passes a value already within range through unchanged', () => {
        expect(clamp(5, 0, 10)).to.equal(5);
    });
    it('clamps below the minimum', () => {
        expect(clamp(-1, 0, 10)).to.equal(0);
    });
    it('clamps above the maximum', () => {
        expect(clamp(11, 0, 10)).to.equal(10);
    });
});

describe('computeFitScale', () => {
    it('never enlarges a box that already fits', () => {
        expect(computeFitScale(100, 100, 1000, 1000)).to.equal(1);
    });

    it('shrinks to fit a box larger than the viewport, minus padding', () => {
        // (1000 - 2*40) / 2000 = 0.46
        expect(computeFitScale(2000, 500, 1000, 1000)).to.be.closeTo(
            0.46,
            0.001,
        );
    });

    it('picks the more constraining dimension', () => {
        const byWidth = computeFitScale(2000, 100, 1000, 1000);
        const byHeight = computeFitScale(100, 2000, 1000, 1000);
        expect(byWidth).to.be.closeTo(byHeight, 0.001);
    });

    it('clamps to MIN_SCALE for an extremely large box', () => {
        expect(computeFitScale(1_000_000, 1_000_000, 500, 500)).to.equal(
            MIN_SCALE,
        );
    });
});

const buildStage = ({
    scale,
    translateX,
    translateY,
}: {
    scale?: number;
    translateX?: number;
    translateY?: number;
} = {}) => {
    const canvas = document.createElement('div');
    const stage = document.createElement('div');
    stage.setAttribute('data-flume-component', 'stage');
    if (scale !== undefined) {
        const scaleDiv = document.createElement('div');
        scaleDiv.style.transform = `scale(${scale})`;
        stage.appendChild(scaleDiv);
    }
    if (translateX !== undefined && translateY !== undefined) {
        const translateDiv = document.createElement('div');
        // Flume renders the negated translate - see readStageTransform's comment.
        translateDiv.style.transform = `translate(${-translateX}px, ${-translateY}px)`;
        stage.appendChild(translateDiv);
    }
    canvas.appendChild(stage);
    return { canvas, stage };
};

describe('getStageElement', () => {
    it('finds the stage element inside the canvas wrapper', () => {
        const { canvas, stage } = buildStage();
        expect(getStageElement(canvas)).to.equal(stage);
    });

    it('returns null for a null canvas', () => {
        expect(getStageElement(null)).to.equal(null);
    });

    it('returns null when the canvas has no mounted stage', () => {
        expect(getStageElement(document.createElement('div'))).to.equal(null);
    });
});

describe('readStageTransform', () => {
    it('reads scale and negates the rendered translate back to the real value', () => {
        const { stage } = buildStage({
            scale: 2.5,
            translateX: 100,
            translateY: -50,
        });
        expect(readStageTransform(stage)).to.deep.equal({
            scale: 2.5,
            translateX: 100,
            translateY: -50,
        });
    });

    it('defaults to scale 1 / no translate when nothing is rendered yet', () => {
        const stage = document.createElement('div');
        expect(readStageTransform(stage)).to.deep.equal({
            scale: 1,
            translateX: 0,
            translateY: 0,
        });
    });
});

describe('measureNodeSizes', () => {
    it('divides each node\'s rendered rect by the current scale', () => {
        const { stage } = buildStage({ scale: 2 });
        const nodeEl = document.createElement('div');
        nodeEl.setAttribute('data-flume-component', 'node');
        nodeEl.dataset.nodeId = 'n1';
        vi.spyOn(nodeEl, 'getBoundingClientRect').mockReturnValue({
            width: 200,
            height: 100,
        } as DOMRect);
        stage.appendChild(nodeEl);

        const sizes = measureNodeSizes(stage);

        expect(sizes.get('n1')).to.deep.equal({ width: 100, height: 50 });
    });

    it('skips a node element with no data-node-id', () => {
        const { stage } = buildStage({ scale: 1 });
        const nodeEl = document.createElement('div');
        nodeEl.setAttribute('data-flume-component', 'node');
        stage.appendChild(nodeEl);

        expect(measureNodeSizes(stage).size).to.equal(0);
    });
});

describe('shiftGraphForRemount', () => {
    it('returns the graph unchanged (scale 1) when the stage is not mounted', () => {
        const nodes = { a: { x: 10, y: 20 } } as any;
        const comments = { c: { x: 1, y: 2 } } as any;
        const result = shiftGraphForRemount(nodes, comments, null);
        expect(result).to.deep.equal({ nodes, comments, scale: 1 });
        expect(result.nodes).to.equal(nodes);
    });

    it('shifts nodes and comments by the current pan, in stage-space units', () => {
        const { canvas } = buildStage({
            scale: 2,
            translateX: 100,
            translateY: 50,
        });
        const nodes = { a: { x: 10, y: 20 } } as any;
        const comments = { c: { x: 1, y: 2 } } as any;

        const result = shiftGraphForRemount(nodes, comments, canvas);

        // shiftX = translateX / scale = 50, shiftY = translateY / scale = 25.
        expect(result.scale).to.equal(2);
        expect(result.nodes.a.x).to.equal(10 - 50);
        expect(result.nodes.a.y).to.equal(20 - 25);
        expect(result.comments.c.x).to.equal(1 - 50);
        expect(result.comments.c.y).to.equal(2 - 25);
    });
});

describe('dispatchWheel', () => {
    it('dispatches exactly `steps` wheel events with the given deltaY', () => {
        const stage = document.createElement('div');
        const received: number[] = [];
        stage.addEventListener('wheel', e =>
            received.push((e as WheelEvent).deltaY),
        );

        dispatchWheel(stage, -100, 50, 60, 3);

        expect(received).to.deep.equal([-100, -100, -100]);
    });
});

describe('dispatchPan', () => {
    // jsdom's real MouseEvent constructor rejects `view: window` (a jsdom/vitest environment
    // gap, not a bug in dispatchPan - browsers accept it fine), so it's stubbed out here with a
    // minimal Event subclass just to let construction succeed and let the real dispatchPan/fire
    // coordinate logic run end to end.
    class FakeMouseEvent extends Event {
        clientX: number;
        clientY: number;
        constructor(type: string, init: MouseEventInit = {}) {
            super(type, init);
            this.clientX = init.clientX ?? 0;
            this.clientY = init.clientY ?? 0;
        }
    }

    beforeEach(() => {
        vi.stubGlobal('MouseEvent', FakeMouseEvent);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('fires a mousedown, a threshold-crossing mousemove, then a mouseup', () => {
        const stage = document.createElement('div');
        document.body.appendChild(stage);
        const events: { type: string; x: number; y: number }[] = [];
        const record = (e: Event) => {
            const mouse = e as MouseEvent;
            events.push({ type: e.type, x: mouse.clientX, y: mouse.clientY });
        };
        stage.addEventListener('mousedown', record);
        document.addEventListener('mousemove', record);
        window.addEventListener('mouseup', record);

        dispatchPan(stage, 0, 0, 30, 10);

        expect(events[0]).to.deep.equal({ type: 'mousedown', x: 0, y: 0 });
        // Crosses the >6px drag threshold before the real move.
        expect(events[1]).to.deep.equal({ type: 'mousemove', x: 10, y: 0 });
        // Released at the point yielding the requested (dx, dy) delta.
        expect(events[2]).to.deep.equal({ type: 'mouseup', x: -20, y: -10 });

        document.body.removeChild(stage);
    });
});
