/* eslint-disable no-unused-vars */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const A4_WIDTH = 595.28
export const A4_HEIGHT = 841.89

// Canvas最大高度限制 - 设置为较安全的值，避免超出浏览器限制
// Chrome/Edge/Firefox: ~32,767px, Safari: ~16,384px
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

const CANVAS_IMAGE_TYPE = 'image/jpeg'

/**
 * 计算scale
 * @param {HTMLElement} canvas 元素
 * @param {string} mimeType 图片类型
 * @param {number} maxDataUrlSizeInBytes 最大dataurl尺寸(长度)，如果超出当前浏览器限制会渲染不出来
 * @returns scale
 */
const calculateScale = (canvas, mimeType = CANVAS_IMAGE_TYPE, maxDataUrlSizeInBytes = 8 * 1024 * 1024) => {
  const ctx = canvas.getContext('2d')
  const originalWidth = canvas.width
  const originalHeight = canvas.height

  // 初始尝试获取原始大小的 dataURL
  let dataURL = canvas.toDataURL(mimeType)
  const len = dataURL.length
  const MIN_VALID_LENGTH = 10
  if (len < MIN_VALID_LENGTH) {
    // eslint-disable-next-line no-console
    console.error('元素通过canvas生成dataURL失败, 超过浏览器限制, 请调整元素', canvas)
    return 0
  }

  if (len <= maxDataUrlSizeInBytes) {
    return 1 // 如果初始大小已经符合要求，则不需要缩放
  }


  // 计算缩放比例
  let scale = Math.sqrt(maxDataUrlSizeInBytes / dataURL.length)

  // 调整 canvas 尺寸并重新绘制内容
  const scaledCanvas = document.createElement('canvas')
  scaledCanvas.width = originalWidth * scale
  scaledCanvas.height = originalHeight * scale
  const scaledCtx = scaledCanvas.getContext('2d')
  scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)

  // 获取新的 dataURL 并检查是否符合要求
  dataURL = scaledCanvas.toDataURL(mimeType)
  while (dataURL.length > maxDataUrlSizeInBytes && scale > 0.1) { // 设置最小scale为0.1防止无限循环
    scale *= 0.9 // 细微调整scale
    scaledCanvas.width = originalWidth * scale
    scaledCanvas.height = originalHeight * scale
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
    dataURL = scaledCanvas.toDataURL(mimeType)
  }

  // 清理临时canvas
  scaledCanvas.remove()

  return scale
}

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
 *  获取canvas数据
 * @param {HTMLCanvasElement} canvas canvas
 * @returns 数据
 */
const canvasToData = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((data) => {
    resolve(data)
  }, CANVAS_IMAGE_TYPE, window.devicePixelRatio * 2)
})

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
  try {
    // 检查元素是否有效
    if (!element || !element.offsetWidth) {
      // eslint-disable-next-line no-console
      console.warn("无效元素或元素宽度为0", element)
      return { width: 0, height: 0, data: null, needSplit: false }
    }

    // 特殊处理iframe元素
    if (element.tagName === 'IFRAME') {
      try {
        // eslint-disable-next-line no-console
        console.warn("检测到iframe元素，尝试特殊处理", element)

        // 获取iframe的尺寸
        const elementWidth = element.offsetWidth || element.clientWidth || 600
        const elementHeight = element.offsetHeight || element.clientHeight || 400

        // 检查iframe是否同源
        let isSameOrigin = false
        try {
          // 尝试访问iframe的contentDocument，如果成功则为同源
          isSameOrigin = !!element.contentDocument
          // eslint-disable-next-line no-console
          console.log("iframe同源检查:", isSameOrigin, element.src)
        } catch (e) {
          // 如果出错，则不是同源
          isSameOrigin = false
        }

        // 如果是同源iframe，尝试直接渲染其内容
        if (isSameOrigin && element.contentDocument && element.contentDocument.body) {
          try {
            // eslint-disable-next-line no-console
            console.log("尝试渲染同源iframe内容")

            // 获取iframe的文档
            const iframeDoc = element.contentDocument

            // 尝试使用html2canvas渲染iframe内容
            const iframeCanvas = await html2canvas(iframeDoc.body, {
              allowTaint: true,
              scale: window.devicePixelRatio * 2,
              useCORS: true,
              windowHeight: iframeDoc.body.scrollHeight,
              backgroundColor: opt?.backgroundColor,
              logging: false,
            })

            // 计算PDF中的高度
            const height = (width / elementWidth) * elementHeight

            // 转换为图片数据
            const canvasData = iframeCanvas.toDataURL(CANVAS_IMAGE_TYPE, 1.0)

            // 返回处理结果
            return { width, height, data: canvasData, needSplit: false }
          } catch (sameOriginError) {
            // 如果渲染同源iframe失败，记录错误并回退到占位符
            // eslint-disable-next-line no-console
            console.error("渲染同源iframe失败，使用占位符替代", sameOriginError)
            // 继续执行下面的占位符代码
          }
        }

        // 创建一个占位canvas，用于显示iframe的提示信息
        const tempCanvas = document.createElement('canvas')
        // 设置canvas尺寸为iframe的实际尺寸
        tempCanvas.width = elementWidth
        tempCanvas.height = elementHeight

        const ctx = tempCanvas.getContext('2d')

        // 绘制iframe占位背景
        ctx.fillStyle = '#f5f5f5'
        ctx.fillRect(0, 0, elementWidth, elementHeight)

        // 绘制边框
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 2
        ctx.strokeRect(2, 2, elementWidth - 4, elementHeight - 4)

        // 绘制iframe图标
        const iconSize = Math.min(elementWidth, elementHeight) * 0.2
        const iconX = (elementWidth - iconSize) / 2
        const iconY = (elementHeight - iconSize) / 2 - 20

        // 绘制简单的iframe图标
        ctx.fillStyle = '#999999'
        ctx.fillRect(iconX, iconY, iconSize, iconSize)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.strokeRect(iconX + iconSize * 0.2, iconY + iconSize * 0.2, iconSize * 0.6, iconSize * 0.6)

        // 绘制提示文本
        ctx.fillStyle = '#666666'
        ctx.font = `${Math.max(12, Math.min(16, elementWidth / 30))}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // 获取iframe的源URL
        const iframeSrc = element.src || '外部内容'
        const displaySrc = iframeSrc.length > 40 ? `${iframeSrc.substring(0, 37)}...` : iframeSrc

        // 绘制多行文本
        if (isSameOrigin) {
          ctx.fillText('同源iframe内容渲染失败', elementWidth / 2, elementHeight / 2 + iconSize / 2 + 10)
          ctx.fillText('(可能是由于内容复杂或动态加载)', elementWidth / 2, elementHeight / 2 + iconSize / 2 + 35)
        } else {
          ctx.fillText('iframe内容无法导出', elementWidth / 2, elementHeight / 2 + iconSize / 2 + 10)
          ctx.fillText('(受浏览器安全限制)', elementWidth / 2, elementHeight / 2 + iconSize / 2 + 35)
        }
        ctx.fillText(displaySrc, elementWidth / 2, elementHeight / 2 + iconSize / 2 + 60)

        // 计算PDF中的高度
        const height = (width / elementWidth) * elementHeight

        // 转换为图片数据
        const canvasData = tempCanvas.toDataURL(CANVAS_IMAGE_TYPE, 1.0)

        // 返回处理结果
        return { width, height, data: canvasData, needSplit: false }
      } catch (iframeError) {
        // eslint-disable-next-line no-console
        console.error("处理iframe元素失败", iframeError)

        // 创建一个简单的占位符作为备选方案
        try {
          const elementWidth = element.offsetWidth || 600
          const elementHeight = element.offsetHeight || 400
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = elementWidth
          tempCanvas.height = elementHeight

          const ctx = tempCanvas.getContext('2d')
          ctx.fillStyle = '#eeeeee'
          ctx.fillRect(0, 0, elementWidth, elementHeight)
          ctx.fillStyle = '#666666'
          ctx.font = '14px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('iframe (无法导出)', elementWidth / 2, elementHeight / 2)

          const height = (width / elementWidth) * elementHeight
          const canvasData = tempCanvas.toDataURL(CANVAS_IMAGE_TYPE, 0.8)

          return { width, height, data: canvasData, needSplit: false }
        } catch (fallbackError) {
          // 如果备选方案也失败，返回空结果
          // eslint-disable-next-line no-console
          console.error("创建iframe占位符失败", fallbackError)
        }
      }
    }

    // 检查元素高度，如果过高但有子元素，则返回需要分割
    if (element.scrollHeight > MAX_CANVAS_HEIGHT / (window.devicePixelRatio * 2)) {
      // 检查是否有子元素
      const hasChildElements = [...element.childNodes].some((node) => node.nodeType === 1)

      if (hasChildElements) {
        // eslint-disable-next-line no-console
        console.log("元素过高需要切分 - 预检测", element.scrollHeight)
        return { needSplit: true, height: element.scrollHeight * window.devicePixelRatio * 2 }
      }
    }

    // canvas元素
    const canvas = await html2canvas(element, {
      allowTaint: true, // 允许渲染跨域图片
      scale: window.devicePixelRatio * 2, // 增加清晰度window.devicePixelRatio * 2
      useCORS: true,// 允许跨域
      windowHeight: element.scrollHeight,
      backgroundColor: opt?.backgroundColor, // 内容区域背景色
      logging: false, // 禁用日志以提高性能
    })

    // 获取canvas转化后的宽度
    const canvasWidth = canvas.width
    // 获取canvas转化后的高度
    const canvasHeight = canvas.height

    if (canvasHeight > MAX_CANVAS_HEIGHT) {
      // 如果元素没有子元素但仍然过高，尝试强制渲染
      const hasChildElements = [...element.childNodes].some((node) => node.nodeType === 1)

      if (!hasChildElements) {
        // 尝试强制渲染，但会警告
        // eslint-disable-next-line no-console
        console.warn("元素过高但没有子元素可以切分，尝试强制渲染", element, canvasHeight)

        try {
          // 方法1: 尝试分片渲染 - 将高元素分成多个小片段渲染
          if (element.tagName === 'IMG' || element.tagName === 'CANVAS') {
            // 对于图片或Canvas元素，使用分片渲染
            const pieceHeight = MAX_CANVAS_HEIGHT / (window.devicePixelRatio * 2)
            const pieces = Math.ceil(canvasHeight / pieceHeight)
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = canvasWidth
            tempCanvas.height = canvasHeight
            const tempCtx = tempCanvas.getContext('2d')

            // 分片绘制到临时canvas
            for (let i = 0; i < pieces; i++) {
              const sourceY = i * pieceHeight
              tempCtx.drawImage(canvas, 0, sourceY, canvasWidth, Math.min(pieceHeight, canvasHeight - sourceY),
                0, sourceY, canvasWidth, Math.min(pieceHeight, canvasHeight - sourceY))
            }

            // 高度转化为PDF的高度
            const height = (width / canvasWidth) * canvasHeight
            // const canvasData = await canvasToData(tempCanvas)
            const t = calculateScale(tempCanvas)
            const scale = Math.min(t, 1)
            console.error('scale', scale, t)
            const canvasData = tempCanvas.toDataURL(CANVAS_IMAGE_TYPE, scale)
            tempCtx.clearRect(0, 0, canvasWidth, canvasHeight)
            return { width, height, data: canvasData, needSplit: false }
          }

          // 原有的备选方案
          const height = (width / canvasWidth) * canvasHeight
          const canvasData = canvas.toDataURL(CANVAS_IMAGE_TYPE, 0.8)
          const context = canvas.getContext("2d")
          context.clearRect(0, 0, canvasWidth, canvasHeight)
          return { width, height, data: canvasData, needSplit: false }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("强制渲染过高元素失败", error)
          return { needSplit: true, height: canvasHeight }
        }
      }

      return { needSplit: true, height: canvasHeight }
    }

    // 高度转化为PDF的高度
    const height = (width / canvasWidth) * canvasHeight
    // 转化成图片Data
    const canvasData = canvas.toDataURL(CANVAS_IMAGE_TYPE, 1.0)
    const context = canvas.getContext("2d")
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    return { width, height, data: canvasData, needSplit: false }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("渲染元素到Canvas时出错", element, error)
    return { width: 0, height: 0, data: null, needSplit: false }
  }
}

/**
 * 添加页眉
 * @param {{header: HTMLElement, pdf: jsPDF, contentWidth: number, pageBackgroundColor: string}} opt
 */
export async function addHeader ({header, pdf, contentWidth, pageBackgroundColor}) {
  const { height: headerHeight, data: headerData, } = await toCanvas(header, contentWidth)
  // 先填充空白防止左右两边留空渲染到表格等多余信息
  const PAGE_WIDTH = pdf.getPageWidth()
  addBlank({x: 0, y: 0, width: PAGE_WIDTH, height: headerHeight, pdf, pageBackgroundColor})
  pdf.addImage(headerData, 'JPEG', (PAGE_WIDTH - contentWidth) / 2, 0, contentWidth, headerHeight)
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
  const PAGE_HEIGHT = pdf.getPageHeight()
  const newFooter = footer.cloneNode(true)
  const pageNumDom = newFooter.querySelector(`${pageNowClass}`)
  const pageTotalDom = newFooter.querySelector(`${pageTotalClass}`)
  if (pageNumDom) {
    pageNumDom.innerText = pageNum
  }
  if (pageTotalDom) {
    pageTotalDom.innerText = total
  }
  const PAGE_WIDTH = pdf.getPageWidth()
  document.documentElement.append(newFooter)
  const { height: footerHeight, data: footerData, } = await toCanvas(newFooter, contentWidth)
  // 先填充空白防止左右两边留空渲染到表格等多余信息
  addBlank({x: 0, y: PAGE_HEIGHT - footerHeight, width: PAGE_WIDTH, height: footerHeight, pdf, pageBackgroundColor})
  pdf.addImage(footerData, 'JPEG', (PAGE_WIDTH - contentWidth) / 2, PAGE_HEIGHT - footerHeight, contentWidth, footerHeight)
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
  const PAGE_WIDTH = pdf.getPageWidth()
  const PAGE_HEIGHT = pdf.getPageHeight()
  if (pageBackgroundColor) {
    const color = hexToRgb(pageBackgroundColor)
    pdf.setFillColor(color.r, color.g, color.b)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F")
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
 * 检查元素样式，提供警告信息
 * 该方法经测试对时间消耗可以忽略不计
 * @param {HTMLElement} element 元素
 * @param {boolean} [_isBaseElement=false] 是否当前canvas根元素 (保留参数但不使用)
 * @returns {void}
 */
export const checkElementStyle = (element, _isBaseElement = false) => {
  const style = window.getComputedStyle(element)
  const assertStyle = (styleName, cb, msg) => {
    const v = style.getPropertyValue(styleName)
    if (cb(v)) {
      // eslint-disable-next-line no-console
      console.warn("导出PDF", "样式警告", msg, element)
    }
  }
  assertStyle("z-index", (v) => v && v !== "auto" && v > 0, "z-index在PDF无效如果导出效果和页面不一致请通过顺序调整上下关系")
  // 注意：以下代码被注释掉，但保留以供参考
  // assertStyle("margin-top", (v) => v && _isBaseElement, "当前元素由于上级元素过高自动拆分导致margin-top无效")
}
