import Human from '@vladmandic/human';

let human: Human | null = null;

self.onmessage = async (e) => {
    const { imageBitmap, humanConfig } = e.data;

    try {
        // Initialize human if not already done
        if (!human) {
            human = new Human(humanConfig);
            await human.load();
        }

        // Detect faces
        const result = await human.detect(imageBitmap);
        const faces = (result.face || []).map((face, i) => ({
            id: i,
            box: {
                x: face.box[0],
                y: face.box[1],
                width: face.box[2],
                height: face.box[3]
            },
            score: face.score,
            embedding: face.embedding
        }));

        self.postMessage({
            timestamp: Date.now(),
            engine: 'human',
            faces
        });
    } catch (error) {
        console.error('Worker detection error:', error);
        self.postMessage({
            timestamp: Date.now(),
            engine: 'human',
            faces: []
        });
    }
};
