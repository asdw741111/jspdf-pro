/* eslint-disable no-console */
import { createPDF } from "../src/index"

document.getElementById("export").onclick = () => {
  createPDF(document.getElementById("pdf"))
    .forcePageTotal(true)
    .margin({left: 40, top: 40, bottom: 20})
    .footer(document.getElementById("footer"), {skipPage: 1})
    .header(document.getElementById("header"), {skipPage: 1})
    .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v))
    .onProgress((page, total) => {
      console.log("progress", page, total)
    }).render().then((r) => r.getPDF().save("save.pdf"))
}
