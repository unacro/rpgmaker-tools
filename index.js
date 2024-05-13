import { statSync, readdirSync, createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import mapEditor from "./map-editor";
import MapFlag from "./config";

const mapId = process.env.RM_MAP_TEMPLATE_ID;
const targetMapDataFile = `${process.env.RM_GAME_ROOT}/data/Map${mapId}.json`;

function main(args) {
	let option = "build";
	if (Array.isArray(args)) option = args.length > 0 ? args[0] : "default";
	switch (option.toLowerCase()) {
		case "edit": {
			const matrixConfig = {
				posX: Number.parseInt(process.env.RM_MAP_TARGET_RECT_X),
				posY: Number.parseInt(process.env.RM_MAP_TARGET_RECT_Y),
				rectWidth: Number.parseInt(process.env.RM_MAP_TARGET_RECT_W),
				rectHeight: Number.parseInt(process.env.RM_MAP_TARGET_RECT_H),
			};
			const workMode = process.env.APP_WORK_MODE; // LR / RL / TB / BT / MIRROR / ROTATE

			mapEditor.setMatrix(
				...Object.values(matrixConfig).map((value) => Number.parseInt(value)),
			); // 设置选区

			mapEditor.loadMapFile(targetMapDataFile); // 缓存文件名 & 载入地图数据对象
			const rawMatrix = mapEditor.loadMapDataFromFile();
			console.log(
				`Start to handle map ${mapId}(name: [${mapEditor.getMapName()}])...`,
			);
			mapEditor.saveMapDataToFile(
				mapEditor.transformMatrix(rawMatrix, workMode),
			);
			break;
		}

		default:
			try {
				const targetPath = "./data";
				const stats = statSync(targetPath);
				const mapMatrixFileList = [];
				if (stats.isDirectory()) {
					mapMatrixFileList.push(
						...readdirSync(targetPath)
							.filter((file) => file.endsWith(".txt"))
							.map((file) => path.join(targetPath, file)),
					);
				} else {
					console.warn(`path ${targetPath} is invalid`);
				}
				const mapMatrixList = mapMatrixFileList.map((mapMatrixFilepath) =>
					mapEditor.loadMapMatrix(mapMatrixFilepath, 11),
				);
				const mapFlagMap = {
					0: MapFlag.floor[0],
					1: MapFlag.wall[0],
					2: MapFlag.door[0],
					3: MapFlag.door[1],
				}; // 映射地图标记
				mapMatrixList.map((mapMatrix, index) => {
					console.log(`Map matrix ${index + 1}:`);
					console.table(
						mapMatrix.map((row) => row.map((cell) => mapFlagMap[cell])),
					);
				});
			} catch (err) {
				console.error(err);
			}
			break;
	}
}

main(process.argv.slice(2));
