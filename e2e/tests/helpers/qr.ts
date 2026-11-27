import type { Page } from '@playwright/test';
import QRCode from 'qrcode';

// Renders `text` as a real QR code onto an offscreen canvas, then replaces
// the wallet's camera APIs (enumerateDevices, getUserMedia) so its scanner
// "sees" that canvas instead of a real camera.
export async function mockCameraWithQrCode(page: Page, text: string): Promise<void> {
	const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
	const size = qr.modules.size;
	const matrix: number[][] = [];
	for (let row = 0; row < size; row++) {
		const cols: number[] = [];
		for (let col = 0; col < size; col++) {
			cols.push(qr.modules.get(row, col) ? 1 : 0);
		}
		matrix.push(cols);
	}

	// The scanner only analyzes the center 2/3 of the frame, so the quiet
	// zone needs to be wider than the spec minimum to keep the QR pattern
	// itself inside that crop.
	await installMockCamera(page, matrix, Math.ceil(size / 2), ['environment'], []);
}

// Same fake camera, but it only ever shows a blank frame, so the scanner stays
// open without decoding anything. Pass both facing modes to get a back and a
// front camera, which makes the scanner show its switch-camera button. Cameras
// listed in `failing` refuse to open, as when another app holds them.
export async function mockBlankCameras(
	page: Page,
	facingModes: CameraFacingMode[] = ['environment'],
	{ failing = [] }: { failing?: CameraFacingMode[] } = {},
): Promise<void> {
	await installMockCamera(page, [], 20, facingModes, failing);
}

type CameraFacingMode = 'environment' | 'user';

// How many times the page has asked for the camera since the fake camera was installed.
// Throws when no fake camera is installed, so a comparison of two counts can't
// pass as undefined === undefined.
export async function countCameraRequests(page: Page): Promise<number> {
	// @ts-expect-error test-only counter set by installMockCamera
	const count = await page.evaluate(() => window.__e2eCameraRequests as number | undefined);
	if (count === undefined) {
		throw new Error('No fake camera is installed on this page; call mockBlankCameras or mockCameraWithQrCode first');
	}
	return count;
}

// Read native track state so tests verify release, not just calls to stop().
export async function cameraTracks(page: Page): Promise<{ id: string; deviceId: string; readyState: MediaStreamTrackState }[]> {
	return page.evaluate(() => {
		const tracks = (window as unknown as { __e2eCameraTracks?: { track: MediaStreamTrack; deviceId: string }[] }).__e2eCameraTracks;
		if (!tracks) throw new Error('No fake camera is installed on this page');
		return tracks.map(({ track, deviceId }) => ({ id: track.id, deviceId, readyState: track.readyState }));
	});
}

async function installMockCamera(page: Page, matrix: number[][], quietZone: number, facingModes: CameraFacingMode[], failing: CameraFacingMode[]): Promise<void> {
	await page.evaluate(({ matrix, moduleSize, quietZone, facingModes, failing }) => {
		const size = matrix.length;
		const dim = (size + quietZone * 2) * moduleSize;

		// Each camera draws on its own canvas, so a test can tell in --debug which camera is live.
		const cameras = facingModes.map((facingMode) => {
			const deviceId = `e2e-fake-${facingMode}-camera`;
			const device = { deviceId, kind: 'videoinput' as const, label: `e2e fake ${facingMode} camera`, groupId: `${deviceId}-group` };
			const canvas = document.createElement('canvas');
			canvas.width = dim;
			canvas.height = dim;
			const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
			return { device, facingMode, canvas, ctx };
		});

		for (const { device, facingMode, ctx } of cameras) {
			if (size > 0) {
				ctx.fillStyle = '#fff';
				ctx.fillRect(0, 0, dim, dim);
				ctx.fillStyle = '#000';
				for (let row = 0; row < size; row++) {
					for (let col = 0; col < size; col++) {
						if (matrix[row][col]) {
							ctx.fillRect((col + quietZone) * moduleSize, (row + quietZone) * moduleSize, moduleSize, moduleSize);
						}
					}
				}
				// Chromium only emits a "new" captured frame when the canvas pixels
				// change, so a static canvas stalls the scanner's frame loop after one
				// attempt. Toggling one corner pixel keeps frames flowing.
				setInterval(() => {
					ctx.fillStyle = ctx.fillStyle === '#000000' ? '#fefefe' : '#000000';
					ctx.fillRect(dim - 1, dim - 1, 1, 1);
				}, 100);
			} else {
				// No code to read: a colour and the camera's name, plus a moving bar and a
				// frame count, which also keep frames flowing.
				let frame = 0;
				setInterval(() => {
					frame++;
					ctx.fillStyle = facingMode === 'environment' ? '#dbeafe' : '#dcfce7';
					ctx.fillRect(0, 0, dim, dim);
					ctx.fillStyle = '#1f2937';
					ctx.font = 'bold 20px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillText(device.label, dim / 2, dim / 2 - 10);
					ctx.font = '16px sans-serif';
					ctx.fillText(`frame ${frame}`, dim / 2, dim / 2 + 20);
					ctx.fillRect((frame * 8) % dim, dim - 24, 24, 12);
				}, 100);
			}
		}

		const tracks: { track: MediaStreamTrack; deviceId: string }[] = [];
		(window as unknown as { __e2eCameraTracks: typeof tracks }).__e2eCameraTracks = tracks;

		// @ts-expect-error test-only override of the real camera APIs
		navigator.mediaDevices.enumerateDevices = async () => cameras.map(({ device }) => device);
		// @ts-expect-error test-only counter read by countCameraRequests
		window.__e2eCameraRequests = 0;
		navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
			// @ts-expect-error test-only counter read by countCameraRequests
			window.__e2eCameraRequests++;
			// Webcam asks for a camera by deviceId. The scanner itself asks by
			// facing mode, and gets the first camera.
			const requested = typeof constraints?.video === 'object' ? constraints.video.deviceId : undefined;
			const deviceId = typeof requested === 'object' && !Array.isArray(requested) ? requested.exact ?? requested.ideal : requested;
			const camera = cameras.find(({ device }) => device.deviceId === deviceId) ?? cameras[0];
			if (failing.includes(camera.facingMode)) {
				throw new DOMException('Could not start video source', 'NotReadableError');
			}
			// Each request owns fresh tracks, just like a real camera. Keep native stop().
			const stream = camera.canvas.captureStream(10);
			const track = stream.getVideoTracks()[0];
			track.getCapabilities = () => ({ width: { max: dim }, height: { max: dim }, facingMode: [camera.facingMode] }) as MediaTrackCapabilities;
			tracks.push({ track, deviceId: camera.device.deviceId });
			return stream;
		};
	}, { matrix, moduleSize: 8, quietZone, facingModes, failing });
}
