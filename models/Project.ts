import MLModel from './MLModel';

class Project {
    private id: string;
    private name: string;
    private description: string;
    private createdAt: string;
    private starred: boolean;
    private mlModels: MLModel[];

    constructor(id: string, name: string, description: string, createdAt: string, starred: boolean, mlModels: MLModel[] = []) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = createdAt;
        this.starred = starred;
        this.mlModels = mlModels;
    }

    getId(): string {
        return this.id;
    };

    getName(): string {
        return this.name;
    };

    getDescription(): string {
        return this.description;
    };

    getCreatedAt(): string {
        return this.createdAt;
    };

    getStarred(): boolean {
        return this.starred;
    };

    getModels(): MLModel[] {
        return this.mlModels;
    }

    setName(name: string): void {
        this.name = name;
    }

    setDescription(description: string): void {
        this.description = description;
    }

    setStarred(starred: boolean): void {
        this.starred = starred;
    }

    addModel(model: MLModel): void {
        this.mlModels.push(model);
    }

    removeModel(model: MLModel): void {
        const index = this.mlModels.indexOf(model);
        if (index > -1) {
            this.mlModels.splice(index, 1);
        }
    }

    static fromJSON(jsonString: string): Project | null {
        try {
            const { createdAt, id, name, starred, mlModels = [],
            } = JSON.parse(jsonString);

            return new Project(
                createdAt,
                id,
                name,
                starred,
                mlModels.map((mlModel: MLModel) => MLModel.fromJSON(JSON.stringify(mlModel)) as MLModel)
            );
        } catch (error) {
            console.error('Failed to parse JSON:', error);
            return null;
        }
    }

    toJSON(): string {
        return JSON.stringify({
            createdAt: this.createdAt,
            id: this.id,
            name: this.name,
            starred: this.starred,
            mlModels: this.mlModels.map((mlModel) => mlModel.toJSON())
        });
    }
}

export default Project;