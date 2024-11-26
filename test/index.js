/* eslint-disable no-console */
import { createPDF } from "../src/index"

/**
 * 进度条
 * @returns progress obj
 */
const getProgress = () => {
  const bar = document.querySelector('#progress .bar')
  const container = document.querySelector('#progress')
  const text = document.querySelector('#progress .percent')
  return {
    show () {
      bar.style.width = '0%'
      text.innerText = '0%'
      container.style.display = 'block'
    },
    hide () {
      container.style.display = 'none'
    },
    percent (percent = 0) {
      const p = Math.min(1, Math.max(percent, 0))
      text.innerText = `${p * 100}%`
      bar.style.width = `${p * 100}%`
      if (p >= 1) {
        setTimeout(() => {
          this.hide()
        }, 2000)
      }
    }
  }
}

const p = getProgress()

document.getElementById("export").onclick = () => {
  p.show()
  createPDF(document.getElementById("pdf"))
    .forcePageTotal(true)
    .setStyleCheck(false)
    .margin({left: 40, top: 40, bottom: 20})
    .footer(document.getElementById("footer"), {skipPage: 1})
    .header(document.getElementById("header"), {skipPage: 1})
    .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v))
    .onProgress((page, total) => {
      console.log("progress", page, total)
      p.percent(page / total)
    }).render().then((r) => r.getPDF().save("save.pdf"))
}
