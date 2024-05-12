import { existsSync, readFileSync, writeFileSync } from "node:fs";

class MapDataEditor {
	_getMapData(mapDataFilePath) {
		if (!existsSync(mapDataFilePath)) {
			throw new Error(`File \`${mapDataFilePath}\` not exists`);
		}
		const mapObject = JSON.parse(readFileSync(mapDataFilePath, "utf-8"));
		if (!("data" in mapObject) || !Array.isArray(mapObject.data)) {
			throw new Error(`Map data file \`${mapDataFilePath}\` not contains data`);
		}
		const chunkSize = mapObject.data.length / 6; // 一二三四层 阴影层 区域ID层
		if (chunkSize !== Number.parseInt(chunkSize)) {
			throw new Error("Map data size is wrong");
		}
		if (mapObject.data.length / 6 / mapObject.width !== mapObject.height) {
			throw new Error("Map tile id layer size don't match map width & height");
		}
		return mapObject;
	}

	constructor(path) {
		this._dataFile = path;
		this._cache = this._getMapData(path);
		this._tileIdChunkIndex = (this._cache.data.length * 5) / 6;
		this._x = undefined;
		this._y = undefined;
		this._width = undefined;
		this._height = undefined;
	}

	_getMapSelection() {
		if (!this._x || !this._y || !this._width || !this._height) {
			throw new Error("Map selection is not set");
		}
		const mapTileIdChunk = this._cache.data.slice(
			this._tileIdChunkIndex,
			this._cache.data.length,
		);
		const mapDataMatrix = []; // map tileId matrix
		for (let i = 0; i < this._width; i++) {
			const rowIndex = (this._y + i) * this._cache.width;
			const buffer = [];
			for (let j = 0; j < this._height; j++) {
				const colIndex = this._x + j;
				buffer.push(mapTileIdChunk[rowIndex + colIndex]);
			}
			mapDataMatrix.push([...buffer]);
		}
		return mapDataMatrix;
	}

	_setMapSelection(mapDataMatrix) {
		const offsetIndex = this._tileIdChunkIndex;
		for (let i = 0; i < this._width; i++) {
			const rowIndex = (this._y + i) * this._cache.width;
			for (let j = 0; j < this._height; j++) {
				const colIndex = this._x + j;
				this._cache.data[offsetIndex + rowIndex + colIndex] =
					mapDataMatrix[i][j];
			}
		}
		console.log(this._cache.data.slice(offsetIndex));
		return true;
	}

	_leftToRight(mapDataMatrix) {
		const [width, height] = [mapDataMatrix[0].length, mapDataMatrix.length];
		// const newMapDataMatrix = Array.from(this._height, () => Array(this._width).fill(0));
		for (let row = 0; row < height; row++) {
			for (let col = Math.ceil(width / 2); col < width; col++) {
				// console.log(`tile[${row}][${col}] = ${mapDataMatrix[row][col]} => ${mapDataMatrix[row][width - col - 1]}`,);
				mapDataMatrix[row][col] = mapDataMatrix[row][width - col - 1];
			}
		}
		return mapDataMatrix;
	}

	_rightToLeft(mapDataMatrix) {
		const [width, height] = [mapDataMatrix[0].length, mapDataMatrix.length];
		for (let row = 0; row < height; row++) {
			for (let col = 0; col < Math.floor(width / 2); col++) {
				mapDataMatrix[row][col] = mapDataMatrix[row][width - col - 1];
			}
		}
		return mapDataMatrix;
	}

	_topToBottom(mapDataMatrix) {
		const [width, height] = [mapDataMatrix[0].length, mapDataMatrix.length];
		for (let row = Math.ceil(height / 2); row < height; row++) {
			for (let col = 0; col < width; col++) {
				mapDataMatrix[row][col] = mapDataMatrix[height - row - 1][col];
			}
		}
		return mapDataMatrix;
	}

	_bottomToTop(mapDataMatrix) {
		const [width, height] = [mapDataMatrix[0].length, mapDataMatrix.length];
		for (let row = 0; row < Math.floor(height / 2); row++) {
			for (let col = 0; col < width; col++) {
				mapDataMatrix[row][col] = mapDataMatrix[height - row - 1][col];
			}
		}
		return mapDataMatrix;
	}

	_rotate(mapDataMatrix) {
		const [width, height] = [mapDataMatrix[0].length, mapDataMatrix.length];
		if (width !== height) {
			console.error("Map selection is not square");
			return false;
		}
		const sideLength = width; // 正方形边长
		const halfSideLength = Math.ceil(sideLength / 2); // 正方形边长的一半
		for (let row = 0; row < halfSideLength; row++) {
			for (let col = 0; col < halfSideLength; col++) {
				if (
					(row < halfSideLength && col < halfSideLength) ||
					mapDataMatrix[sideLength - 1 - col][row] === 0
				) {
					mapDataMatrix[sideLength - 1 - col][row] = mapDataMatrix[row][col];
				}
				if (
					(row < halfSideLength && col < halfSideLength) ||
					mapDataMatrix[col][sideLength - 1 - row] === 0
				) {
					mapDataMatrix[col][sideLength - 1 - row] = mapDataMatrix[row][col];
				}
				if (
					(row < halfSideLength && col < halfSideLength) ||
					mapDataMatrix[sideLength - 1 - row][sideLength - 1 - col] === 0
				) {
					mapDataMatrix[sideLength - 1 - row][sideLength - 1 - col] =
						mapDataMatrix[row][col];
				}
			}
		}
		return mapDataMatrix;
	}

	_rewrite() {
		try {
			writeFileSync(this._dataFile, JSON.stringify(this._cache), "utf8");
			console.log(`Save map data to \`${this._dataFile}\` successfully`);
			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
	}

	getMapName() {
		return this._cache.displayName;
	}

	setMatrix(x, y, width, height) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
	}

	handle(handleMethod) {
		if (!this._cache) {
			throw new Error("Map data is not loaded");
		}
		let mapMatrix = this._getMapSelection(this._cache);
		// const mapMatrix = [
		// 	[1, 2, 3, 4, 5],
		// 	[6, 0, 0, 0, 10],
		// 	[11, 12, 0, 0, 15],
		// 	[16, 0, 0, 0, 20],
		// 	[21, 0, 0, 24, 25],
		// ]; // debug
		console.log("before:", mapMatrix);
		switch (handleMethod) {
			case "LR":
				console.log("Copy left to right");
				mapMatrix = this._leftToRight(mapMatrix);
				break;

			case "RL":
				console.log("Copy right to left");
				mapMatrix = this._rightToLeft(mapMatrix);
				break;

			case "TB":
				console.log("Copy top to bottom");
				mapMatrix = this._topToBottom(mapMatrix);
				break;

			case "BT":
				console.log("Copy bottom to top");
				mapMatrix = this._bottomToTop(mapMatrix);
				break;

			case "MIRROR":
				console.log("Mirror flip");
				mapMatrix = this._leftToRight(mapMatrix);
				mapMatrix = this._topToBottom(mapMatrix);
				break;

			case "ROTATE":
				console.log("Rotation by left-top");
				mapMatrix = this._rotate(mapMatrix);
				break;

			default:
				break;
		}
		console.log("after: ", mapMatrix);
		this._setMapSelection(mapMatrix);
		this._rewrite();
		return true;
	}
}

const mapId = 12;
const targetMapDataFile = `../Project1/data/Map${mapId}.json`;
const mapEditor = new MapDataEditor(targetMapDataFile);

mapEditor.setMatrix(7, 1, 11, 11);
console.log(
	`Start to handle map ${mapId}(name: [${mapEditor.getMapName()}])...`,
);
// mapEditor.handle("LR");
// mapEditor.handle("RL");
// mapEditor.handle("TB");
// mapEditor.handle("BT");
// mapEditor.handle("MIRROR");
mapEditor.handle("ROTATE");
