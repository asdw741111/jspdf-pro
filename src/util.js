/* eslint-disable no-unused-vars */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const A4_WIDTH = 595.266
export const A4_HEIGHT = 841.8762

export const MAX_CANVAS_HEIGHT = 42000
/** 该元素直接另起一页（如果不是第一页） */
export const BREAK_PAGE_CLASS = 'pdf-break-page'
/** 不需要计算子元素，允许跨页的 */
export const NORMAL_FINAL_CLASS = 'pdf-not-calc-height'
/** 不需要计算子元素，不允许跨页（空间不够整体放到下一页） */
export const GROUP_FINAL_CLASS = 'pdf-not-calc-height-group'
/** 有滚动条的元素, 会先移除滚动效果全部展开, 渲染后再恢复 */
export const SCROLL_CLASS = 'pdf-scroll'
/** 页脚当前页数元素对应class */
export const FOOTER_PAGE_NOW_CLASS = 'pdf-footer-page'
/** 页脚总页数元素对应class */
export const FOOTER_PAGE_TOTAL_CLASS = 'pdf-footer-page-total'

/**
 * 十六进制颜色转rgb
 * @param {string} hex 十六进制颜色
 * @returns rgb
 */
const hexToRgb = (hex) => {
  const r = Number.parseInt(hex.substring(1, 3), 16)
  const g = Number.parseInt(hex.substring(3, 5), 16)
  const b = Number.parseInt(hex.substring(5, 7), 16)
  return { r, g, b }
}
/**
 * 获取元素上边距
 * 该方法经测试对时间消耗可以忽略不计
 * @param {HTMLElement} element 元素
 * @returns {{top: number, bottom: number}}
 */
export const getMargin = (element) => {
  const style = window.getComputedStyle(element)
  const marginTop = style.getPropertyValue("margin-top")
  const marginBottom = style.getPropertyValue("margin-bottom")
  // 经过测试只有向上取整才能实现一个canvas和多个canvas拼接的结果一致（如果用em作为单位会导致转换到px不是整数，应当规避）
  return {
    // top: Math.ceil(marginTop ? marginTop.replace("px", "") * 1 : 0),
    // bottom: Math.ceil(marginBottom ? marginBottom.replace("px", "") * 1 : 0),
    top: marginTop ? marginTop.replace("px", "") * 1 : 0,
    bottom: marginBottom ? marginBottom.replace("px", "") * 1 : 0,
  }
}
/**
 * 获取元素生成canvas的高度
 * @param {HTMLElement} element ele
 * @returns 高度
 */
export const getElementCanvasHeight = (element) => window.devicePixelRatio * 2 * element.clientHeight
/**
 * 判断是否元素超出canvas最大高度
 * @param {HTMLElement} element ele
 * @returns 是否超出canvas最大高度
 */
export const isElementOverflowCanvas = (element) => getElementCanvasHeight(element) > MAX_CANVAS_HEIGHT
/**
 * 将元素转化为canvas元素
 * 通过 放大 提高清晰度
 * width为内容宽度
 * @param {HTMLElement} element
 * @param {number} width
 * @param {{backgroundColor: string}} [opt] 参数
 * @returns
 */
export async function toCanvas (element, width, opt) {
  // canvas元素
  const canvas = await html2canvas(element, {
    allowTaint: true, // 允许渲染跨域图片
    scale: window.devicePixelRatio * 2, // 增加清晰度window.devicePixelRatio * 2
    useCORS: true,// 允许跨域
    windowHeight: element.scrollHeight,
    backgroundColor: opt?.backgroundColor, // 内容区域背景色
  })
  // 获取canvas转化后的宽度
  const canvasWidth = canvas.width
  // 获取canvas转化后的高度
  const canvasHeight = canvas.height
  if (canvasHeight > MAX_CANVAS_HEIGHT) {
    return {needSplit: true, height: canvasHeight}
  }
  // 高度转化为PDF的高度
  const height = (width / canvasWidth) * canvasHeight
  // 转化成图片Data
  const canvasData = canvas.toDataURL('image/jpeg', 1.0)
  const context = canvas.getContext("2d")
  //   console.log(canvasData)
  context.clearRect(0, 0, canvasWidth, canvasHeight)
  return { width, height, data: canvasData, }
}

/**
 * 添加页眉
 * @param {{header: HTMLElement, pdf: jsPDF, contentWidth: number, pageBackgroundColor: string}} opt
 */
export async function addHeader ({header, pdf, contentWidth, pageBackgroundColor}) {
  const { height: headerHeight, data: headerData, } = await toCanvas(header, contentWidth)
  // 先填充空白防止左右两边留空渲染到表格等多余信息
  addBlank({x: 0, y: 0, width: A4_HEIGHT, height: headerHeight, pdf, pageBackgroundColor})
  pdf.addImage(headerData, 'JPEG', (A4_WIDTH - contentWidth) / 2, 0, contentWidth, headerHeight)
}

/**
 * 添加页脚
 * @typedef {Object} Opt
 * @property {number} total - 总页数
 * @property {number} pageNum - 当前页
 * @property {HTMLElement} footer - ele
 * @property {jsPDF} pdf - pdf
 * @property {number} contentWidth - 宽度
 * @property {string} pageNowClass - 当前页码class
 * @property {string} pageTotalClass - 总页码class
 * @property {string} [pageBackgroundColor] - 背景色
 * @param {Opt} opt 参数
 */
export async function addFooter ({total, pageNum, footer, pdf, contentWidth, pageNowClass, pageTotalClass, pageBackgroundColor}) {
  const newFooter = footer.cloneNode(true)
  const pageNumDom = newFooter.querySelector(`${pageNowClass}`)
  const pageTotalDom = newFooter.querySelector(`${pageTotalClass}`)
  if (pageNumDom) {
    pageNumDom.innerText = pageNum
  }
  if (pageTotalDom) {
    pageTotalDom.innerText = total
  }
  document.documentElement.append(newFooter)
  const { height: footerHeight, data: footerData, } = await toCanvas(newFooter, contentWidth)
  // 先填充空白防止左右两边留空渲染到表格等多余信息
  addBlank({x: 0, y: A4_HEIGHT - footerHeight, width: A4_WIDTH, height: footerHeight, pdf, pageBackgroundColor})
  pdf.addImage(footerData, 'JPEG', (A4_WIDTH - contentWidth) / 2, A4_HEIGHT - footerHeight, contentWidth, footerHeight)
  document.documentElement.removeChild(newFooter)
}

/**
 * 向pdf添加图片，从左上角计算
 * 如果需要将图片裁剪可以设置x或者y为负数，相当于图片左上角超出了pdf区域来实现裁剪
 * @typedef {Object} AddImgOpt
 * @property {number} x 横坐标，正数向右计算
 * @property {number} y 纵坐标，正数向下计算
 * @property {jsPDF} pdf pdf
 * @property {object} data canvas数据
 * @property {number} width 宽度
 * @property {number} height 高度
 * @property {string} [pageBackgroundColor] 页面背景色
 * @param {AddImgOpt} opt 参数
 */
// 添加
export function addImage ({x, y, pdf, data, width, height, pageBackgroundColor}) {
  // 高度为0或者没有数据（宽、高为0无法渲染canvas）
  if (!height || !data) {
    // eslint-disable-next-line no-console
    console.warn("元素异常 - 当前元素无法渲染canvas，尺寸信息: ", `width - ${width}, height - ${height}`, `坐标: x - ${x}, y - ${y}`)
    return
  }
  if (pageBackgroundColor) {
    const color = hexToRgb(pageBackgroundColor)
    pdf.setFillColor(color.r, color.g, color.b)
    pdf.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F")
  }
  pdf.addImage(data, 'JPEG', x, y, width, height)
}

/**
 * 增加空白遮挡
 * @typedef {Object} BlankOpt
 * @property {number} x 横坐标
 * @property {number} y 纵坐标
 * @property {number} width 宽度
 * @property {number} height 高度
 * @property {jsPDF} pdf pdf
 * @property {string} [pageBackgroundColor] 背景色 默认白色
 * @param {BlankOpt} opt
 */
export function addBlank ({x, y, width, height, pdf, pageBackgroundColor}) {
  const color = pageBackgroundColor ? hexToRgb(pageBackgroundColor) : {r: 255, g: 255, b: 255}
  pdf.setFillColor(color.r, color.g, color.b)
  pdf.rect(x, y, Math.ceil(width), Math.ceil(height), 'F')
}

/**
 * 计算元素距离页面顶部高度
 * 通过遍历offsetParant获取距离顶端元素的高度值
 * @param {HTMLElement} el
 * @returns
 */
export const getElementTop = (el) => {
  let actualTop = el.offsetTop
  let current = el.offsetParent

  while (current && current !== null) {
    actualTop += current.offsetTop
    current = current.offsetParent
  }
  return actualTop
}
/**
 * 检查过高元素
 * @param {number} top 元素距离顶部
 * @param {number} height 元素高度
 * @param {number[]} pages 分页信息
 * @param {number} originalPageHeight 一页高度
 */
const checkElementHeight = (top, height, pages, originalPageHeight) => {
  const morePage = Math.ceil((top - pages[pages.length - 1] + height) / originalPageHeight) - 1
  if (morePage) {
    for (let i = 0; i < morePage; i++) {
      pages.push((pages.length > 0 ? pages[pages.length - 1] : 0) + originalPageHeight)
    }
  }
}

/**
 * 普通元素更新位置的方法
 * 普通元素只需要考虑到是否到达了分页点，即当前距离顶部高度 - 上一个分页点的高度 大于 正常一页的高度，则需要载入分页点
 * @param {number} top 距离顶部高度
 * @param {{baseTop: number, pages: number[], originalPageHeight: number, height: number, leaf: boolean}} opt 其他参数
 * @returns void
 */
export const updateNomalElPos = (top, {baseTop, pages, originalPageHeight, height, leaf}) => {
  const firstBaseTop = baseTop && pages.length === 1
  if (firstBaseTop) {
    if (top + baseTop > originalPageHeight) {
      pages.push(originalPageHeight - baseTop)
    }
  } else if (top - (pages.length > 0 ? pages[pages.length - 1] : 0) > originalPageHeight) {
    pages.push((pages.length > 0 ? pages[pages.length - 1] : 0) + originalPageHeight)
  }
  // 判断高度，如果超出一页高度需要在这里提前添加好page信息确保当前元素能显示完整
  if (leaf) {
    checkElementHeight(top, height, pages, originalPageHeight)
  }
}

/**
 * 可能跨页元素位置更新的方法
 * 需要考虑分页元素，则需要考虑两种情况
 * 1. 普通达顶情况，如上
 * 2. 当前距离顶部高度加上元素自身高度 大于 整页高度，则需要载入一个分页点
 * @param {number} top 元素距离顶部高度
 * @param {{baseTop: number, pages: number[], originalPageHeight: number, height: number}} opt 其他参数
 * @returns void
 */
export const updateCrossPos = (top, {baseTop, pages, originalPageHeight, height}) => {
  const firstBaseTop = baseTop && pages.length === 1
  if (firstBaseTop) {
    if (top + baseTop >= originalPageHeight) {
      pages.push(originalPageHeight - baseTop)
    } else if(top + baseTop + height > originalPageHeight) {
      pages.push(top)
    }
    checkElementHeight(top, height, pages, originalPageHeight)
    return
  }
  if (top - (pages.length > 0 ? pages[pages.length - 1] : 0) >= originalPageHeight) {
    // 如果高度已经超过当前页，则证明可以分页了
    pages.push((pages.length > 0 ? pages[pages.length - 1] : 0) + originalPageHeight)
  } else if ((top + height - (pages.length > 0 ? pages[pages.length - 1] : 0) > originalPageHeight)
    && (top !== (pages.length > 0 ? pages[pages.length - 1] : 0))) {
    // 若 距离当前页顶部的高度 加上元素自身的高度 大于 一页内容的高度, 则证明元素跨页，将当前高度作为分页位置
    pages.push(top)
  }
  checkElementHeight(top, height, pages, originalPageHeight)
}

/**
 * 计算页面内容导出pdf后像素比例，结果为页面像素 / pdf像素
 * 用于针对pdf页面计算html中元素尺寸
 * @param {object} param 参数
 * @param {number} param.htmlContentWidth 要导出内容的页面区域宽度
 * @param {HTMLElement} param.element 要导出内容元素 可选如果htmlContentWidth为空则根据element计算
 * @param {number} param.pdfContentWidth 内容在pdf中的宽度。标准A4宽度是595.266像素
 * @param {number} param.marginLeft 在pdf中左边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 * @param {number} param.marginRight 在pdf中右边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 */
export const getHtmlToPdfPixelRate = ({ htmlContentWidth, element, marginLeft = 0, marginRight = 0, pdfContentWidth }) => {
  const contentWidth = pdfContentWidth || (A4_WIDTH - marginLeft - marginRight)
  const elementWidth = element ? element.offsetWidth : htmlContentWidth
  if (!elementWidth) throw new Error("htmlContentWidth和element至少需要有一个")
  const rate = contentWidth / elementWidth
  return rate
}

/**
 * 计算页面内容导出pdf后像素比例，结果为页面像素 / pdf像素
 * 用于针对pdf页面计算html中元素尺寸
 * @param {object} param 参数
 * @param {HTMLElement} param.element 要计算的元素
 * @param {"height"|"width"} param.type 要计算的类型 height=高度  width=宽度
 * @param {number} param.htmlContentWidth 要导出内容的页面区域宽度
 * @param {HTMLElement} param.pdfRootElement 要导出内容元素 可选如果htmlContentWidth为空则根据element计算
 * @param {number} param.pdfContentWidth 内容在pdf中的宽度。标准A4宽度是595.266像素
 * @param {number} param.marginLeft 在pdf中左边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 * @param {number} param.marginRight 在pdf中右边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 */
export const calcElementSizeInPDF = ({element, type = "height", pdfRootElement, ...rest}) => {
  const rate = getHtmlToPdfPixelRate({...rest, element: pdfRootElement})
  if (type === "height") {
    return element.offsetHeight * rate
  }
  return element.offsetWidth * rate
}

/**
 * 计算页面内容导出pdf后像素比例，结果为页面像素 / pdf像素
 * 用于针对pdf页面计算html中元素尺寸
 * @param {object} param 参数
 * @param {number} param.pdfSize pdf中的多少像素
 * @param {number} param.htmlContentWidth 要导出内容的页面区域宽度
 * @param {HTMLElement} param.element 要导出内容元素 可选如果htmlContentWidth为空则根据element计算
 * @param {number} param.pdfContentWidth 内容在pdf中的宽度。标准A4宽度是595.266像素
 * @param {number} param.marginLeft 在pdf中左边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 * @param {number} param.marginRight 在pdf中右边距，注意不是HTML中的像素。标准A4宽度是595.266像素，如果未设置pdfContentWidth则根据左右边距计算
 */
export const calcHtmlSizeByPdfSize = ({pdfSize, ...rest}) => {
  const rate = getHtmlToPdfPixelRate(rest)
  if (!pdfSize || !rate) throw new Error("pdfSize和pdf元素相关参数必须都有")
  return pdfSize / rate
}

/**
 * 获取元素上边距
 * 该方法经测试对时间消耗可以忽略不计
 * @param {HTMLElement} element 元素
 * @param {boolean} [isBaseElement=false] 是否当前canvas根元素
 * @returns {{top: number, bottom: number}}
 */
export const checkElementStyle = (element, isBaseElement = false) => {
  const style = window.getComputedStyle(element)
  const assertStyle = (styleName, cb, msg) => {
    const v = style.getPropertyValue(styleName)
    if (cb(v)) {
      // eslint-disable-next-line no-console
      console.warn("导出PDF", "样式警告", msg, element)
    }
  }
  assertStyle("z-index", (v) => v && v !== "auto" && v > 0, "z-index在PDF无效如果导出效果和页面不一致请通过顺序调整上下关系")
  // assertStyle("margin-top", (v) => v && isBaseElement, "当前元素由于上级元素过高自动拆分导致margin-top无效")
}
