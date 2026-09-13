import { describe, expect, it, vi } from 'vitest';
import { StudioBridge, type StudioSnapshot } from './bridge';

const snapshot: StudioSnapshot = {
	phase: 'idle',
	client: null,
	displayedEntries: [],
	activeVenueId: 'fridge',
	autoInviteArmed: false,
	estimatedWorkMs: 12_000,
	workStartedAt: null,
	residentClientArmed: false,
	hiredRoleIds: [],
	reducedVfx: false,
	commissionChannel: 'none',
	receptionistVisible: false,
	modelLoading: false
};

describe('StudioBridge', () => {
	it('fans emit out to subscribers and supports unsubscribe', () => {
		const bridge = new StudioBridge();
		const a = vi.fn();
		const b = vi.fn();
		const unsubA = bridge.subscribe(a);
		bridge.subscribe(b);

		bridge.emit({ type: 'ready' });
		expect(a).toHaveBeenCalledWith({ type: 'ready' });
		expect(b).toHaveBeenCalledWith({ type: 'ready' });

		unsubA();
		bridge.emit({ type: 'talk-to-client' });
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(2);
	});

	it('buffers lastSnapshot on sync and does not throw when send precedes handler', () => {
		const bridge = new StudioBridge();
		expect(() => bridge.send({ type: 'summon-client' })).not.toThrow();
		expect(() => bridge.send({ type: 'spawn-visitor' })).not.toThrow();
		bridge.sync(snapshot);
		expect(bridge.lastSnapshot).toEqual(snapshot);

		const handler = vi.fn();
		bridge.setCommandHandler(handler);
		expect(handler).toHaveBeenCalledWith({ type: 'sync', snapshot });

		bridge.send({ type: 'summon-client' });
		expect(handler).toHaveBeenCalledWith({ type: 'summon-client' });
	});

	it('emits open-shop and prop-bark outbound events', () => {
		const bridge = new StudioBridge();
		const listener = vi.fn();
		bridge.subscribe(listener);

		bridge.emit({ type: 'open-shop', shop: 'toolkit' });
		bridge.emit({ type: 'open-storage' });
		bridge.emit({ type: 'prop-bark', propId: 'fridge', text: 'Leftover casserole.' });
		bridge.emit({ type: 'open-reception' });

		expect(listener).toHaveBeenNthCalledWith(1, { type: 'open-shop', shop: 'toolkit' });
		expect(listener).toHaveBeenNthCalledWith(2, { type: 'open-storage' });
		expect(listener).toHaveBeenNthCalledWith(3, {
			type: 'prop-bark',
			propId: 'fridge',
			text: 'Leftover casserole.'
		});
		expect(listener).toHaveBeenNthCalledWith(4, { type: 'open-reception' });
	});
});
