/* eslint-disable no-console */
import { createPDF, } from "../src/index"

/**
 * 进度条
 * @returns progress obj
 */
const getProgress = () => {
  const bar = document.querySelector('#progress .bar')
  const container = document.querySelector('#progress')
  const text = document.querySelector('#progress .percent')
  const btn = document.querySelector('.progress button')

  return {
    /**
     * pdf
     * @param {Html2Pdf} pdf pdf
     */
    show (pdf) {
      bar.style.width = '0%'
      text.innerText = '0%'
      container.style.display = 'block'
      btn.onclick = () => {
        pdf.cancel()
        this.hide()
      }
    },
    hide () {
      container.style.display = 'none'
    },
    percent (percent = 0) {
      const p = Math.min(1, Math.max(percent, 0)).toFixed(2)
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
  const pdf = createPDF(document.getElementById("pdf"))
  p.show(pdf)
  pdf.forcePageTotal(true)
    .setStyleCheck(false)
    // .setPageBackgroundColor("#efefef")
    // .setContentBackgroundColor("#c7fefe")
    .changeOrientation('l')
    .margin({left: 20, top: 20, bottom: 20})
    .footer(document.getElementById("footer"), {skipPage: 1})
    .header(document.getElementById("header"), {skipPage: 1})
    .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v))
    .onProgress((page, total) => {
      console.log("progress", page, total)
      p.percent(page / total)
    }).render().then((r) => r.getPDF().save("save.pdf")).catch((e) => console.log("ERRRRR", e))
}
