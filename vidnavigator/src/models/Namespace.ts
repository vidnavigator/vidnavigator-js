export interface NamespaceRefJSON {
  id: string;
  name: string;
}

export class NamespaceRef {
  id: string;
  name: string;

  constructor(data: NamespaceRefJSON) {
    this.id = data.id;
    this.name = data.name;
  }

  static fromJSON(json: NamespaceRefJSON): NamespaceRef {
    return new NamespaceRef(json);
  }
}

export interface NamespaceJSON {
  id?: string;
  _id?: string;
  user_id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export class Namespace {
  id?: string;
  _id?: string;
  user_id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;

  constructor(data: NamespaceJSON) {
    this.id = data.id;
    this._id = data._id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromJSON(json: NamespaceJSON): Namespace {
    return new Namespace(json);
  }

  toJSON(): NamespaceJSON {
    return {
      id: this.id,
      _id: this._id,
      user_id: this.user_id,
      name: this.name,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
