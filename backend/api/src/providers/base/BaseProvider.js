export default class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  async search(query) {
    throw new Error(
      `${this.name}: search() not implemented`
    );
  }

  async getStream(id) {
    throw new Error(
      `${this.name}: getStream() not implemented`
    );
  }

  async getSong(id) {
    throw new Error(
      `${this.name}: getSong() not implemented`
    );
  }

  async getAlbum(id) {
    throw new Error(
      `${this.name}: getAlbum() not implemented`
    );
  }

  async getArtist(id) {
    throw new Error(
      `${this.name}: getArtist() not implemented`
    );
  }

  async getPlaylist(id) {
    throw new Error(
      `${this.name}: getPlaylist() not implemented`
    );
  }
}