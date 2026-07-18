import BaseProvider from "../base/BaseProvider.js";
import { searchItunes } from "./search.js";

export default class ItunesProvider extends BaseProvider {
  constructor() {
    super("itunes");
  }

  async search(query) {
    return searchItunes(query);
  }

  async getStream(id) {
    throw new Error(`iTunes streams are direct preview URLs. Missing URL for ${id}.`);
  }
}

