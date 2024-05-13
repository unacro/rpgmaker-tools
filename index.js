import { statSync, readdirSync, createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import mapEditor from "./map-editor";

const mapId = process.env.RM_MAP_TEMPLATE_ID;
const targetMapDataFile = `${process.env.RM_GAME_ROOT}/data/Map${mapId}.json`;

function main(args) {
	let option = "build";
	if (args) option = Array.isArray(args) ? args[0] : args;
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
				const newMapFileList = [];
				if (stats.isDirectory()) {
					newMapFileList.push(
						...readdirSync(targetPath)
							.filter((file) => file.endsWith(".txt"))
							.map((file) => path.join(targetPath, file)),
					);
				} else {
					console.warn(`path ${targetPath} is invalid`);
				}
				const targetStart = '"data":';
				const mapDataList = [];
				function readFilesSequentially(index) {
					if (index < newMapFileList.length) {
						const fileStream = createReadStream(newMapFileList[index]);
						const rl = createInterface({
							input: fileStream,
							crlfDelay: Number.POSITIVE_INFINITY,
						});

						let found = false;

						rl.on("line", (line) => {
							if (line.startsWith(targetStart)) {
								mapDataList.push(
									JSON.parse(
										`{${line
											.replaceAll("1", "8")
											.replaceAll("2", "98")
											.replaceAll("3", "99")
											.replace(/,$/, "")}}`,
									),
								);
								found = true;
							}
						});

						rl.on("close", () => {
							if (!found) {
								mapDataList.push(`Not found in ${newMapFileList[index]}`);
							}
							readFilesSequentially(index + 1);
						});
					} else {
						console.log("All files read");
						// console.log(mapDataList);
						const sample = mapDataList.pop().data;
						const chunkedArray = [];
						const chunkSize = Number.parseInt(process.env.RM_MAP_TARGET_RECT_W);
						for (let i = 0; i < sample.length; i += chunkSize) {
							chunkedArray.push(sample.slice(i, i + chunkSize));
						}
						mapEditor._setMapSelection(chunkedArray);
					}
				}
				readFilesSequentially(0);
			} catch (err) {
				console.error(err);
			}
			break;
	}
}

main(process.argv.slice(2));
