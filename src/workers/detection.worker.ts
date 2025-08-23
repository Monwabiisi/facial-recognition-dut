import { handleWorkerMessage } from './detection.worker.logic';

self.onmessage = async (e) => {
    const result = await handleWorkerMessage(e.data);
    if (result) {
        self.postMessage(result);
    }
};
