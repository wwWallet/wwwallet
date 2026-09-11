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

	await page.evaluate(({ matrix, moduleSize, quietZone }) => {
		const size = matrix.length;
		const dim = (size + quietZone * 2) * moduleSize;

		const canvas = document.createElement('canvas');
		canvas.width = dim;
		canvas.height = dim;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
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

		// Reused for every getUserMedia() call rather than capturing fresh each
		// time: the scanner probes the "camera" twice before Webcam's own call,
		// stop()-ing the track each time, which otherwise left the stream stuck
		// at readyState 0 for good. stop() is stubbed out to a no-op so that's
		// harmless here.
		const stream = canvas.captureStream(10);
		const track = stream.getVideoTracks()[0];
		// CanvasCaptureMediaStreamTrack doesn't normally implement this; the
		// scanner needs it to pick a "back" camera and a resolution.
		track.getCapabilities = () => ({ width: { max: dim }, height: { max: dim }, facingMode: ['environment'] }) as MediaTrackCapabilities;
		track.stop = () => { };

		const fakeDevice = { deviceId: 'e2e-fake-camera', kind: 'videoinput' as const, label: 'e2e fake camera', groupId: 'e2e-fake-camera-group' };
		// @ts-expect-error test-only override of the real camera APIs
		navigator.mediaDevices.enumerateDevices = async () => [fakeDevice];
		navigator.mediaDevices.getUserMedia = async () => stream;
	}, {
		matrix,
		moduleSize: 8,
		// The scanner only analyzes the center 2/3 of the frame, so the quiet
		// zone needs to be wider than the spec minimum to keep the QR pattern
		// itself inside that crop.
		quietZone: Math.ceil(size / 2),
	});
}
