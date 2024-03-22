/* eslint-disable no-console */
import { createPDF } from "../src/index"

document.getElementById("export").onclick = () => {
  createPDF(document.getElementById("pdf"))
    .forcePageTotal(true)
    .footer(document.getElementById("footer"), {skipPage: 1})
    .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v))
    .onProgress((page, total) => {
      console.log("progress", page, total)
    }).toPdf()
}
