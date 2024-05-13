import { existsSync, readFileSync, writeFileSync } from "node:fs";

class MapDataEditor {
	constructor() {
		this._filepath = undefined;
		this._cache = undefined;
		this._posX = undefined;
		this._posY = undefined;
		this._rectWidth = undefined;
		this._rectHeight = undefined;
	}

	_leftToRight(rawMatrix) {
		const [width, height] = [rawMatrix[0].length, rawMatrix.length];
		// const newMatrix = Array.from({ length: height }, () => Array(width).fill(0));
		const newMatrix = rawMatrix.map((rowData) => [...rowData]);
		for (let row = 0; row < height; row++) {
			for (let col = Math.ceil(width / 2); col < width; col++) {
				// console.log(`tile[${row}][${col}] = ${newMatrix[row][col]} => ${rawMatrix[row][width - col - 1]}`,);
				newMatrix[row][col] = rawMatrix[row][width - col - 1];
			}
		}
		return newMatrix;
	}

	_rightToLeft(rawMatrix) {
		const [width, height] = [rawMatrix[0].length, rawMatrix.length];
		const newMatrix = rawMatrix.map((rowData) => [...rowData]);
		for (let row = 0; row < height; row++) {
			for (let col = 0; col < Math.floor(width / 2); col++) {
				newMatrix[row][col] = rawMatrix[row][width - col - 1];
			}
		}
		return newMatrix;
	}

	_topToBottom(rawMatrix) {
		const [width, height] = [rawMatrix[0].length, rawMatrix.length];
		const newMatrix = rawMatrix.map((rowData) => [...rowData]);
		for (let row = Math.ceil(height / 2); row < height; row++) {
			for (let col = 0; col < width; col++) {
				newMatrix[row][col] = rawMatrix[height - row - 1][col];
			}
		}
		return newMatrix;
	}

	_bottomToTop(rawMatrix) {
		const [width, height] = [rawMatrix[0].length, rawMatrix.length];
		const newMatrix = rawMatrix.map((rowData) => [...rowData]);
		for (let row = 0; row < Math.floor(height / 2); row++) {
			for (let col = 0; col < width; col++) {
				newMatrix[row][col] = rawMatrix[height - row - 1][col];
			}
		}
		return newMatrix;
	}

	_rotate(rawMatrix) {
		const [width, height] = [rawMatrix[0].length, rawMatrix.length];
		const newMatrix = rawMatrix.map((rowData) => [...rowData]);
		if (width !== height) {
			console.error("Raw matrix is not a square");
			return rawMatrix;
		}
		const sideLength = width; // 正方形边长
		const halfSideLengthLimit = Math.ceil(sideLength / 2); // 正方形边长的一半
		for (let row = 0; row < halfSideLengthLimit; row++) {
			for (let col = 0; col < halfSideLengthLimit; col++) {
				if (
					(row < halfSideLengthLimit && col < halfSideLengthLimit) ||
					newMatrix[sideLength - 1 - col][row] === 0
				) {
					newMatrix[sideLength - 1 - col][row] = rawMatrix[row][col];
				}
				if (
					(row < halfSideLengthLimit && col < halfSideLengthLimit) ||
					newMatrix[col][sideLength - 1 - row] === 0
				) {
					newMatrix[col][sideLength - 1 - row] = rawMatrix[row][col];
				}
				if (
					(row < halfSideLengthLimit && col < halfSideLengthLimit) ||
					newMatrix[sideLength - 1 - row][sideLength - 1 - col] === 0
				) {
					newMatrix[sideLength - 1 - row][sideLength - 1 - col] =
						rawMatrix[row][col];
				}
			}
		}
		return newMatrix;
	}

	transformMatrix(rawMatrix, transformMethod) {
		function __isMatrix(matrix) {
			if (!Array.isArray(matrix) || matrix.length === 0) {
				return false;
			}
			const columnLength = matrix[0].length;
			for (let i = 1; i < matrix.length; i++) {
				if (!Array.isArray(matrix[i]) || matrix[i].length !== columnLength) {
					return false;
				}
			}
			return true;
		}
		if (!__isMatrix(rawMatrix)) {
			throw new Error("Input data is not a matrix");
		}
		let transformedMatrix = undefined;
		switch (transformMethod) {
			case "LR":
				console.log("Copy left to right");
				transformedMatrix = this._leftToRight(rawMatrix);
				break;

			case "RL":
				console.log("Copy right to left");
				transformedMatrix = this._rightToLeft(rawMatrix);
				break;

			case "TB":
				console.log("Copy top to bottom");
				transformedMatrix = this._topToBottom(rawMatrix);
				break;

			case "BT":
				console.log("Copy bottom to top");
				transformedMatrix = this._bottomToTop(rawMatrix);
				break;

			case "MIRROR":
				console.log("Mirror flip");
				transformedMatrix = this._topToBottom(this._leftToRight(rawMatrix));
				break;

			case "ROTATE":
				console.log("Rotation by left-top");
				transformedMatrix = this._rotate(rawMatrix);
				break;

			default:
				break;
		}
		console.log("before:");
		console.table(rawMatrix);
		console.log("after: ");
		console.table(transformedMatrix);
		return transformedMatrix;
	}

	getMapName() {
		return this._cache.displayName;
	}

	loadMapFile(mapDataFilePath) {
		if (!existsSync(mapDataFilePath)) {
			throw new Error(`File \`${mapDataFilePath}\` not exists`);
		}
		let mapDataObject = undefined;
		try {
			mapDataObject = JSON.parse(readFileSync(mapDataFilePath, "utf-8"));
		} catch (error) {
			throw new Error(
				`Map data file \`${mapDataFilePath}\` parse content to json failed`,
			);
		}
		if (!("data" in mapDataObject) || !Array.isArray(mapDataObject.data)) {
			throw new Error(
				`Map data object \`${mapDataFilePath}\` not contains data`,
			);
		}
		const chunkSize = mapDataObject.data.length / 6; // 一二三四层 阴影层 区域ID层
		if (chunkSize !== Number.parseInt(chunkSize)) {
			throw new Error("Map data size is invalid");
		}
		if (
			mapDataObject.data.length / 6 / mapDataObject.width !==
			mapDataObject.height
		) {
			throw new Error("Map tile id layer size don't match map width & height");
		}
		this._filepath = mapDataFilePath; // 缓存文件路径
		Object.freeze(mapDataObject); // 防止意外篡改地图对象的其他数据
		this._cache = mapDataObject; // 缓存地图数据对象到类内部
		return this._cache.data; // 没有递归 freeze 因此内部某个对象的属性仍然可以修改
	}

	saveMapFile(mapDataObject, mapDataFilePath) {
		try {
			writeFileSync(mapDataFilePath, JSON.stringify(mapDataObject), "utf8");
			console.log(`Save map data to \`${mapDataFilePath}\` successfully`);
			return true;
		} catch (error) {
			console.error(error);
		}
		return false;
	}

	setMatrix(posX, posY, rectWidth, rectHeight) {
		this._posX = posX;
		this._posY = posY;
		this._rectWidth = rectWidth;
		this._rectHeight = rectHeight;
		console.log(
			`Set matrix start at (${posX}, ${posY}) width=${rectWidth} height=${rectHeight}`,
		);
	}

	loadMapDataFromFile(
		{ posX, posY, rectWidth, rectHeight } = {
			posX: this._posX,
			posY: this._posY,
			rectWidth: this._rectWidth,
			rectHeight: this._rectHeight,
		},
		mapDataFilePath = undefined,
	) {
		if (mapDataFilePath) {
			this.loadMapFile(mapDataFilePath);
		}
		if (!posX || !posY || !rectWidth || !rectHeight) {
			throw new Error("Map data matrix selection is not set");
		}
		const [offsetIndex, maxlength] = [
			(this._cache.data.length * 5) / 6,
			this._cache.data.length,
		];
		const mapTileIdChunk = this._cache.data.slice(offsetIndex, maxlength); // RM 区域 ID 层
		const mapDataMatrix = []; // map tileId matrix
		for (let i = 0; i < rectWidth; i++) {
			const rowOffset = (posY + i) * this._cache.width;
			const buffer = [];
			for (let j = 0; j < rectHeight; j++) {
				const index = rowOffset + (posX + j); // rowOffset + colOffset
				if (index < 0 || index >= mapTileIdChunk.length) {
					console.warn(
						`Set matrix start at (${posX}, ${posY}) width=${rectWidth} height=${rectHeight}`,
					);
					throw new Error(
						`Array index out of bounds: index=${index} maxLength=${mapTileIdChunk.length}`,
					);
				}
				buffer.push(mapTileIdChunk[index]);
			}
			mapDataMatrix.push([...buffer]);
		}
		if (
			mapDataMatrix.length !== rectWidth ||
			mapDataMatrix?.[0]?.length !== rectHeight
		) {
			console.error(
				"Map data matrix size is invalid:",
				`(x, y)=(${posX}, ${posY}) width=${rectWidth} height=${rectHeight}`,
			);
			console.table("mapDataMatrix:", mapDataMatrix);
			throw new Error("Load map data matrix failed");
		}
		return mapDataMatrix;
	}

	saveMapDataToFile(mapDataMatrix, mapDataFilePath = undefined) {
		if (mapDataFilePath) {
			this.loadMapFile(mapDataFilePath);
		}
		const offsetIndex = (this._cache.data.length * 5) / 6;
		for (let i = 0; i < this._rectWidth; i++) {
			const rowOffset = (this._posY + i) * this._cache.width;
			for (let j = 0; j < this._rectHeight; j++) {
				const colOffset = this._posX + j;
				this._cache.data[offsetIndex + rowOffset + colOffset] =
					mapDataMatrix[i][j];
			}
		}
		this.saveMapFile(this._cache, this._filepath);
		return true;
	}
}

const mapDataEditor = new MapDataEditor();
export default mapDataEditor;
