enum ModelStatus {
    Deployed = 'Deployed',
    Inactive = 'Inactive',
}

interface Metadata {
    createdAt: string;
    version: string;
    description: string;
    usageCount: number;
}

export class MLModel {
    private readonly id: string;
    private name: string;
    private status: ModelStatus;
    private metadata: Readonly<Metadata>;

    constructor(
        id: string,
        name: string,
        status: ModelStatus,
        metadata: Metadata
    ) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.metadata = Object.freeze(metadata);
    }

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getStatus(): ModelStatus {
        return this.status;
    }

    getMetadata(): Metadata {
        return this.metadata;
    }

    setName(name: string): void {
        this.name = name;
    }

    setStatus(status: ModelStatus): void {
        this.status = status;
    }

    static fromJSON(jsonString: string): MLModel | null {
        try {
            const { id, name, status, metadata } = JSON.parse(jsonString);
            return new MLModel(id, name, status, metadata);
        } catch (error) {
            console.error('Failed to parse JSON:', error);
            return null;
        }
    };

    toJSON(): string {
        return JSON.stringify({
            id: this.id,
            name: this.name,
            status: this.status,
            metadata: this.metadata,
        });
    }
}

// TensorFlowModel subclass
export class TensorFlowModel extends MLModel {
    private modelPath: string;

    constructor(
        id: string,
        name: string,
        status: ModelStatus,
        metadata: Metadata,
        modelPath: string
    ) {
        super(id, name, status, metadata);
        this.modelPath = modelPath;
    }

    getModelPath(): string {
        return this.modelPath;
    }

    setModelPath(modelPath: string): void {
        this.modelPath = modelPath;
    }
}

// ScikitLearnModel subclass
export class ScikitLearnModel extends MLModel {
    private modelFile: string;

    constructor(
        id: string,
        name: string,
        status: ModelStatus,
        metadata: Metadata,
        modelFile: string
    ) {
        super(id, name, status, metadata);
        this.modelFile = modelFile;
    }

    getModelFile(): string {
        return this.modelFile;
    }

    setModelFile(modelFile: string): void {
        this.modelFile = modelFile;
    }
}

export default MLModel;