import { statSync, readdirSync } from "node:fs";
import path from "node:path";
const fs = require("node:fs");
const readline = require("node:readline");
import MapDataEditor from "./map-editor";

const mapId = process.env.RM_MAP_TEMPLATE_ID;
const targetMapDataFile = `${process.env.RM_MAP_TEMPLATE_ROOT}/data/Map${mapId}.json`;
const mapEditor = new MapDataEditor(targetMapDataFile);

function main(args) {
	let option = "build";
	if (args) option = Array.isArray(args) ? args[0] : args;
	switch (option.toLowerCase()) {
		case "edit": {
			const matrixConfig = {
				x: process.env.RM_MAP_TEMPLATE_RECT_X,
				y: process.env.RM_MAP_TEMPLATE_RECT_Y,
				width: process.env.RM_MAP_TEMPLATE_RECT_W,
				height: process.env.RM_MAP_TEMPLATE_RECT_H,
			};
			const workMode = process.env.APP_WORK_MODE; // LR / RL / TB / BT / MIRROR / ROTATE

			mapEditor.setMatrix(...Object.values(matrixConfig));
			console.log(
				`Start to handle map ${mapId}(name: [${mapEditor.getMapName()}])...`,
			);
			mapEditor.handle(workMode);
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
						const fileStream = fs.createReadStream(newMapFileList[index]);
						const rl = readline.createInterface({
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
						const chunkSize = Number.parseInt(
							process.env.RM_MAP_TEMPLATE_RECT_W,
						);
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
