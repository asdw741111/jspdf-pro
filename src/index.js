import jsPDF from 'jspdf'
import {
  A4_HEIGHT, A4_WIDTH, toCanvas, BREAK_PAGE_CLASS, NORMAL_FINAL_CLASS, GROUP_FINAL_CLASS, SCROLL_CLASS, FOOTER_PAGE_NOW_CLASS, FOOTER_PAGE_TOTAL_CLASS,
  addBlank, addFooter, addHeader, addImage, getElementTop, updateNomalElPos, updateCrossPos, getMargin, isElementOverflowCanvas,
  checkElementStyle,
} from "./util"
export { calcElementSizeInPDF, calcHtmlSizeByPdfSize } from "./util"

/**
 * 是否包含指定class
 * @param {HTMLElement} el 元素
 * @param {string} className class名称
 * @returns boolean
 */
const hasClass = (el, className) => el.classList ? el.classList.contains(className) : false
/**
 * 检测class
 * @param {HTMLElement} el 元素
 * @param {(clz: string) => boolean} check 检测函数
 * @returns boolean
 */
const checkClass = (el, check) => el.classList ? [...el.classList.values()].findIndex((v) => check?.(v)) > -1 : false

/**
 * @property {HTMLElement} #element
 * @property {HTMLElement} data.header
 */
export class Html2Pdf {
  /** @private 当前根元素 required */
  #element
  /** @private 控制class */
  #controlClass = {
    BREAK_PAGE_CLASS, NORMAL_FINAL_CLASS, GROUP_FINAL_CLASS, SCROLL_CLASS, FOOTER_PAGE_NOW_CLASS, FOOTER_PAGE_TOTAL_CLASS
  }
  #filter = {
    isLeafWithoutDeepFilter: () => false,
    isLeafWithDeepFilter: () => false,
  }
  /**
   * @private
   * @type {{
   *   pdf: jsPDF
   *   forceTotalPage: boolean
   *   totalPage: number
   *   startTime: number
   *   skipPage: number
   *   contentWidth: number
   *   margin: {left: number, top: number, bottom: number}
   *   pageNumSelector: string
   *   pageTotalSelector: string
   *   header: HTMLElement
   *   headerSkip: number
   *   footer: HTMLElement
   *   canvasHeight: Map<any, number>
   *   styleCheckEnable: boolean
   *   pageBackgroundColor: string
   *   contentBackgroundColor: string
   *   rendered: boolean
   *   stoped: boolean
   *   orientation: 'l' | 'p'
   *   recursionDepth: number
   *   maxRecursionDepth: number
   * }}
   */
  #data = {
    skipPage: 0,
    headerSkip: 0,
    pageNumSelector: `.${FOOTER_PAGE_NOW_CLASS}`,
    pageTotalSelector: `.${FOOTER_PAGE_TOTAL_CLASS}`,
    pdf: undefined,
    totalPage: 0,
    startTime: 0,
    contentWidth: 550,
    canvasHeight: new Map(), // map可以将element作为key，不会出现问题
    margin: {left: (A4_WIDTH - 550) / 2, top: 0,bottom: 0},
    styleCheckEnable: true,
    pageBackgroundColor: undefined,
    contentBackgroundColor: undefined,
    rendered: false,
    stoped: false,
    orientation: 'p',
    recursionDepth: 0,
    maxRecursionDepth: 100, // Maximum recursion depth to prevent infinite loops
  }
  /**
   * @private
   * @type {(pageNum: number, totalPage: number) => void}
   */
  #progressCallback

  /**
   * 创建导出类
   * @param {HTMLElement} element 要导出pdf的元素
   */
  constructor (element) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError("element不是HTML元素")
    }
    this.#element = element
  }
  /**
   * 设置默认控制class
   * @param {"BREAK_PAGE_CLASS" | "NORMAL_FINAL_CLASS" | "GROUP_FINAL_CLASS" | "SCROLL_CLASS" | "FOOTER_PAGE_NOW_CLASS" | "FOOTER_PAGE_TOTAL_CLASS"} type 类型
   * @param {string} value 样式class
   * @returns this
   */
  aliaClass (type, value) {
    this.#controlClass[type] = value
    return this
  }
  /**
   * 获取页面宽度
   * @returns {number} 宽度
   */
  getPageWidth () {
    return this.#data.pdf?.getPageWidth() ?? (this.#data.orientation === 'l' ? A4_HEIGHT : A4_WIDTH)
  }
  /**
   * 获取页面高度
   * @returns {number} 页面高度
   */
  getPageHeight () {
    return this.#data.pdf?.getPageHeight() ?? (this.#data.orientation === 'l' ? A4_WIDTH : A4_HEIGHT)
  }
  /**
   * 设置在pdf中的宽度，应当小于595.266(即A4尺寸pdf宽度像素)，如果小于最大宽度会居中显示
   * @param {number} width 宽度, 默认550
   * @returns this
   */
  contentWidth (width) {
    const PAGE_WIDTH = this.getPageWidth()
    if (width < 1 || width > PAGE_WIDTH) {
      throw new Error(`宽度应当小于${PAGE_WIDTH}`)
    }
    this.#data.contentWidth = width
    this.#data.margin.left = (PAGE_WIDTH - width) / 2
    return this
  }
  /**
   * 设置边距，如果只有left或right其中一个则宽度以contentWidth(width)为准并计算右边距。如果left right都有则自动计算内容宽度。上下边距默认0
   * @param {object} param 边距 单位像素
   * @param {number} [param.left] 左边距
   * @param {number} [param.right] 右边距
   * @param {number} [param.top] 上边距
   * @param {number} [param.bottom] 下边距
   */
  margin ({left, right, top, bottom}) {
    const PAGE_WIDTH = this.getPageWidth()
    if (typeof(left) === "number" && typeof(right) === "number") {
      this.#data.margin.left = left
      this.#data.contentWidth = PAGE_WIDTH - left - right
    } else if (typeof(left) === "number") {
      this.#data.margin.left = left
    } else if (typeof(right) === "number") {
      this.#data.margin.left = PAGE_WIDTH - right - this.#data.contentWidth
    }
    if (typeof(top) === "number") {
      this.#data.margin.top = top
    }
    if (typeof(bottom) === "number") {
      this.#data.margin.bottom = bottom
    }
    return this
  }
  /**
   * 设置页眉
   * @param {HTMLElement} header 页眉元素
   * @param {object} [opt] 配置
   * @param {number} [opt.skipPage] 要跳过的页数(不渲染页眉)，跳过前几页
   * @returns this
   */
  header (header, opt = {}) {
    const { skipPage } = opt
    this.#data.header = header
    if (typeof(skipPage) === "number") {
      this.#data.headerSkip = skipPage
    }
    return this
  }
  /**
   * 设置页脚 注意一定不要没有任何文本导致页脚高度没撑起来计算高度错误，可以随意给一个页码例如0即可
   * @param {HTMLElement} footer footer
   * @param {object} [opt] 配置
   * @param {string} [opt.pageNumSelector] pageNumSelector当前页选择器
   * @param {string} [opt.pageTotalSelector] 总页码选择器
   * @param {number} [opt.skipPage] 要跳过的页数(不渲染页脚)
   * @returns this
   */
  footer (footer, opt = {}) {
    const { pageNumSelector, pageTotalSelector, skipPage } = opt
    if (pageNumSelector) {
      this.#data.pageNumSelector = pageNumSelector
    }
    if (pageTotalSelector) {
      this.#data.pageTotalSelector = pageTotalSelector
    }
    if (typeof(skipPage) === "number") {
      this.#data.skipPage = skipPage
    }
    if (!footer) throw new Error("footer不能为空")
    if (!footer.querySelector(this.#data.pageNumSelector) || !footer.querySelector(this.#data.pageTotalSelector)) {
      // eslint-disable-next-line no-console
      console.warn("页脚没有指定当前页码或总页码元素, 将不显示对应数据")
    }
    this.#data.footer = footer
    return this
  }
  /**
   * 获取元素的canvas高度
   * @param {HTMLElement} element 当前元素
   * @returns {Promise<number>} 高度
   */
  async getElementCanvasHeight (element) {
    if (!element) return 0
    if (this.#data.canvasHeight.has(element)) {
      return this.#data.canvasHeight.get(element)
    }
    const contentWidth = this.#data.contentWidth
    const height = (await toCanvas(element, contentWidth)).height
    this.#data.canvasHeight.set(element, height)
    return height
  }
  cancel () {
    this.#data.stoped = true
  }
  /**
   * 设置进度回调函数
   * 如果元素高度超出canvas最大高度，并且没有设置forcePageTotal(true)则pageNum=当前渲染高度, totalPage=总高度，由于存在不跨页、换页等情况导致实际渲染高度增加，会超出总高度
   * @param {(pageNum: number, totalPage: number) => void} progressCallback 回调
   */
  onProgress (progressCallback) {
    this.#progressCallback = typeof(progressCallback) === "function" ? progressCallback : null
    return this
  }
  /**
   * 设置过滤器, 根据元素class判断是否做跨页处理。过滤器说明：
   * - isLeafWithoutDeepFilter: 叶子节点，整体跨页处理，不再遍历内部元素。可能出现的问题是如果该元素高度超出一页还是会出现截断。优点是不用遍历子元素所以性能好。适用于表格行、图片、canvas等。
   * - isLeafWithDeepFilter: 叶子节点，整体跨页处理，但是会继续遍历内部元素，确保不会出现高度高于一页的元素被截断问题。缺点是速度会慢，建议用于较高的元素，例如一个大章节。
   * @param {"isLeafWithoutDeepFilter" | "isLeafWithDeepFilter"} type 过滤器类型
   * @param {(clz: string) => boolean} filter 过滤器
   * @returns this
   */
  setClassControlFilter (type, filter) {
    if (typeof(filter) === "function") {
      this.#filter[type] = filter
    }
    return this
  }
  /**
   * 设置页面背景色，默认白色
   * @param {string} hexColor 十六进制颜色，例如 #FF0000
   * @returns this
   */
  setPageBackgroundColor (hexColor) {
    this.#data.pageBackgroundColor = hexColor
    return this
  }
  /**
   * 设置内容区域背景色（不包括边距和页眉页脚），默认白色
   * @param {string} hexColor 十六进制颜色，例如 #FF0000
   * @returns this
   */
  setContentBackgroundColor (hexColor) {
    this.#data.contentBackgroundColor = hexColor
    return this
  }
  /**
   * 对指定元素渲染pdf
   * @param {{element: HTMLElement, baseTop?: number, justCalc?: boolean, recursionDepth?: number }} opt baseTop - 当前元素距离顶部高度
   * @returns
   */
  async printElement (opt) {
    this.checkStatus()
    const PAGE_WIDTH = this.getPageWidth()
    const PAGE_HEIGHT = this.getPageHeight()
    const {element, justCalc } = opt
    let {baseTop = 0 } = opt
    const recursionDepth = opt.recursionDepth || 0

    // Track recursion depth to prevent infinite loops
    this.#data.recursionDepth = recursionDepth
    if (recursionDepth > this.#data.maxRecursionDepth) {
      // eslint-disable-next-line no-console
      console.error("元素切分递归深度超过最大限制", element, `最大深度: ${this.#data.maxRecursionDepth}`)
      return baseTop
    }

    const contentWidth = this.#data.contentWidth
    const header = this.#data.header
    const footer = this.#data.footer
    const pdf = this.#data.pdf

    // 当前元素包含分页且baseTop != 0则直接分页并设置baseTop为0
    if (hasClass(element, this.#controlClass.BREAK_PAGE_CLASS) && baseTop) {
      if (justCalc) {
        this.#data.totalPage++
      } else {
        pdf.addPage()
      }
      baseTop = 0
    }

    // 检查元素是否有效
    if (!element || !element.offsetWidth) {
      // eslint-disable-next-line no-console
      console.warn("无效元素或元素宽度为0", element)
      return baseTop
    }

    // 元素在网页页面的宽度
    const elementWidth = element.offsetWidth

    // PDF内容宽度 和 在HTML中宽度 的比， 用于将 元素在网页的高度 转化为 PDF内容内的高度， 将 元素距离网页顶部的高度  转化为 距离Canvas顶部的高度
    const rate = contentWidth / elementWidth
    // eslint-disable-next-line no-console
    console.log('Current Page Size Rate(pdf / page) is', rate)

    // 一页的高度， 转换宽度为一页元素的宽度
    let canvasResult = { width: 0, height: 0, data: null, needSplit: false }

    try {
      canvasResult = await toCanvas(element, contentWidth, {backgroundColor: this.#data.contentBackgroundColor})
      const { width, height, data, needSplit } = canvasResult

      if (Number.isNaN(height)) {
        // eslint-disable-next-line no-console
        console.warn("元素高度计算为NaN", element)
        return baseTop
      }

      if (element === this.#element) {
        this.#data.totalHeight = element.clientHeight
        this.#data.heightOffset = getElementTop(element)
      }

      if (needSplit) {
        // 向下对子元素处理
        // eslint-disable-next-line no-console
        console.log("元素过高需要切分", height, element)

        const eles = element.childNodes
        // 检查是否有子元素
        const hasChildElements = [...eles].some((node) => node.nodeType === 1)

        if (!hasChildElements) {
          // eslint-disable-next-line no-console
          console.warn("元素过高但没有子元素可以切分", element)
          // 尝试强制渲染元素，即使它超出了最大高度
          if (!justCalc && data) {
            addImage({
              x: this.#data.margin.left,
              y: baseTop + (header ? await this.getElementCanvasHeight(header) * rate : 0) + this.#data.margin.top,
              pdf, data, width, height,
              pageBackgroundColor: this.#data.pageBackgroundColor
            })
          }
          return baseTop + height
        }

        let subTop = baseTop
        for(const subDom of eles) {
          if (subDom.nodeType === 1) {
            subTop = await this.printElement({
              ...opt,
              element: subDom,
              baseTop: subTop,
              recursionDepth: recursionDepth + 1
            })
          }
        }
        return subTop
      }

      // Store canvas result for later use
      this._currentCanvasResult = canvasResult

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("渲染元素时出错", element, error)
      return baseTop
    }

    // 获取当前canvas结果
    const { width, height, data } = this._currentCanvasResult || { width: 0, height: 0, data: null }

    // 页脚元素 经过转换后在PDF页面的高度 TODO 这里需要缓存footer和header高度，避免重复计算，对性能影响很大
    const footerHeight = (await this.getElementCanvasHeight(footer) * rate)
    const headerHeight = (await this.getElementCanvasHeight(header) * rate)

    // 距离PDF左边的距离
    const baseX = this.#data.margin.left
    // 顶部距离
    const baseY = this.#data.margin.top

    // 出去页头、页眉、还有内容与两者之间的间距后 每页内容的实际高度
    let originalPageHeight = (PAGE_HEIGHT - footerHeight - headerHeight - baseY - this.#data.margin.bottom)

    /**
     * 计算每一页的高度
     * @param {number[]} elementPages 当前element的分页数据
     */
    const triggerPageHeight = (elementPages = [0]) => {
      const _page = justCalc ? this.#data.totalPage + elementPages.length - 1 : pdf.getNumberOfPages()
      const _headerHeight = this.#data.headerSkip ? _page > this.#data.headerSkip ? headerHeight : 0 : headerHeight
      const _footerHeight = this.#data.skipPage ? _page > this.#data.skipPage ? footerHeight : 0 : footerHeight
      const _height = PAGE_HEIGHT - _footerHeight - _headerHeight - baseY - this.#data.margin.bottom
      if (_height !== originalPageHeight) {
        originalPageHeight = _height
      }
    }

    /**
     * 元素是否是跨域最终节点
     * @param {HTMLElement} ele ele
     * @returns 元素是否需要跨页
     */
    const getIsElementCrossLeaf = (ele) => {
      // 不需要计算子元素，不允许跨页
      const isLeafCrossClass = hasClass(ele, this.#controlClass.GROUP_FINAL_CLASS)
      // 图片元素不需要继续深入，作为深度终点
      const notNeedCalcTags = ["IMG", "CANVAS", "THEAD"].includes(ele.tagName)
      // 不需要深度遍历的考虑跨页
      const isLeafWithoutDeep = checkClass(ele, this.#filter.isLeafWithoutDeepFilter)
      return isLeafWithoutDeep || notNeedCalcTags || isLeafCrossClass
    }
    triggerPageHeight()
    // 如果当前元素不需要向下遍历则判断高度是否超出，并且baseTop!=0的话需要换页
    if (baseTop && getIsElementCrossLeaf(element) && height && height + baseTop > originalPageHeight) {
      baseTop = 0
      if (justCalc) {
        this.#data.totalPage++
      } else {
        pdf.addPage()
      }
    }

    const elementMarginTop = getMargin(element).top * rate
    if (!baseTop && elementMarginTop) {
      // 对于元素没有上边距并且有margintop的需要向下偏移，否则会导致整体向上
      baseTop = elementMarginTop
    }

    this.styleCheck(element, true)

    // 每一页的分页坐标， PDF高度， 初始值为根元素距离顶部的距离
    const elementTop = getElementTop(element)
    const pages = [baseTop + headerHeight + baseY]

    /**
     * 获取元素距离网页顶部的距离
     * @param {HTMLElement} el 元素
     * @returns 在element元素内距离顶部高度
     */
    function getBaseElementTop (el) {
      return getElementTop(el) - elementTop
    }
    let lastMarginBottom = 0
    /**
     * 遍历正常的元素节点
     * @param {NodeListOf<ChildNode>} nodes 节点
     * @returns void
     */
    const traversingNodes = (nodes) => {
      for (let i = 0; i < nodes.length; ++i) {
        const one = nodes[i]
        // eslint-disable-next-line no-continue
        if (one.nodeType !== 1) continue
        this.styleCheck(one)
        // 计算一页的高度, 是否包含页眉页脚会影响内容区域高度
        triggerPageHeight(pages)
        // 需要判断跨页且内部存在跨页的元素
        const isBreakPage = hasClass(one, this.#controlClass.BREAK_PAGE_CLASS)
        // 不需要计算子元素，允许跨页的
        const isLeafClass = hasClass(one, this.#controlClass.NORMAL_FINAL_CLASS)
        const isLeafWithDeep = checkClass(one, this.#filter.isLeafWithDeepFilter)
        const isElementCrossLeaf = getIsElementCrossLeaf(one)

        // 对需要处理分页的元素，计算是否跨界，若跨界，则直接将顶部位置作为分页位置，进行分页，且子元素不需要再进行判断
        const { offsetHeight } = one
        // 计算出最终高度
        const offsetTop = getBaseElementTop(one)

        // dom转换后距离顶部的高度
        // 转换成canvas高度 此处需要处理margin-top，因为offsetTop不含margin-top。由于存在塌陷还需要取绝对值防止为负数
        const margin = getMargin(one)
        lastMarginBottom = margin.bottom * rate
        const top = Math.max(0, rate * (offsetTop - margin.top))

        // 对于需要进行分页且内部存在需要分页（即不属于深度终点）的元素进行处理
        if (isBreakPage) {
          if (top) {
            pages.push(top)
          }
          // 遍历子节点
          traversingNodes(one.childNodes)
        } else if (isLeafWithDeep) {
          // 执行位置更新操作
          updateCrossPos(top, {baseTop, pages, originalPageHeight, height: rate * offsetHeight})
          // 执行深度遍历操作
          traversingNodes(one.childNodes)
        } else if (isElementCrossLeaf) {
          // 对于深度终点元素进行处理, dom高度转换成生成pdf的实际高度
          // 代码不考虑dom定位、边距、边框等因素，需在dom里自行考虑，如将box-sizing设置为border-box
          updateCrossPos(top, {baseTop, pages, originalPageHeight, height: rate * offsetHeight})
        } else if (isLeafClass) {
          updateNomalElPos(top, {baseTop, pages, originalPageHeight, height: rate * offsetHeight, leaf: true})
        } else {
          // 对于普通元素，则判断是否高度超过分页值，并且深入
          // 执行位置更新操作
          updateNomalElPos(top, {baseTop, pages, originalPageHeight, height: rate * offsetHeight})
          // 遍历子节点
          traversingNodes(one.childNodes)
        }
      }
    }
    // 深度遍历节点的方法
    if (![...element.childNodes].filter((o) => o.nodeType === 1).length) {
      traversingNodes([element])
    } else {
      traversingNodes(element.childNodes)
    }
    // 可能会存在遍历到底部元素为深度节点，可能存在最后一页位置未截取到的情况
    if (height && pages[pages.length - 1] + originalPageHeight < height) {
      pages.push(pages[pages.length - 1] + originalPageHeight)
    }
    // 当前pdf页中剩余空间距离顶部
    const vt = height ? (pages.length > 1 ? height - pages[pages.length - 1] : baseTop + height) : baseTop
    const returnValue = vt + lastMarginBottom
    // 仅用于计算总页数模式, 添加总页数并返回剩余高度
    if (justCalc) {
      this.#data.totalPage += pages.length - 1
      return returnValue
    }
    // 如果不需要计算总页数并且没有总页数信息，则直接设置（如果需要切分但是没有强制计算总页数则总页数会错误，用户需要设置forcePageTotal(true)）
    if (!justCalc && !this.#data.totalPage && this.#element === element) {
      this.#data.totalPage = pages.length
    }
    // 根据分页位置 开始分页
    for (let i = 0; i < pages.length; ++i) {
      this.checkStatus()
      const needOffset = (baseTop || baseY) && i === 0
      // 只有第一页且有baseTop才需要偏移
      const imgOffSet = needOffset ? (baseTop + headerHeight + baseY) : 0

      // 确保有数据可以渲染
      if (data && width && height) {
        // 根据分页位置新增图片
        addImage({
          x: baseX, y: needOffset ? imgOffSet : baseY + headerHeight - pages[i],
          pdf, data, width, height, pageBackgroundColor: this.#data.pageBackgroundColor
        })
      } else {
        // eslint-disable-next-line no-console
        console.warn("缺少渲染数据", element)
      }
      // 将 内容 与 页眉之间留空留白的部分进行遮白处理
      if (baseY) {
        // eslint-disable-next-line no-console
        console.log("baseY", needOffset ? imgOffSet : baseY + headerHeight - pages[i], baseY, headerHeight)
        addBlank({
          x: 0, y: pdf.getNumberOfPages() > this.#data.headerSkip ? headerHeight : 0,
          width: PAGE_WIDTH, height: baseY, pdf, pageBackgroundColor: this.#data.pageBackgroundColor,
        })
      }
      // 将页脚下边的部分进行遮白处理
      if (this.#data.margin.bottom) {
        const _height = this.#data.margin.bottom + (pdf.getNumberOfPages() > this.#data.skipPage ? footerHeight : 0)
        addBlank({
          x: 0, y: PAGE_HEIGHT - _height,
          width: PAGE_WIDTH, height: _height,
          pdf, pageBackgroundColor: this.#data.pageBackgroundColor
        })
      }
      // 对于除最后一页外，对 内容 的多余部分进行遮白处理
      if (i < pages.length - 1) {
        // 获取当前页面需要的内容部分高度
        const imageHeight = needOffset ? pages[1] : pages[i + 1] - pages[i]
        // 对多余的内容部分进行遮白
        const blankTopBase = baseY + imageHeight + headerHeight + 1
        if (needOffset) {
          addBlank({
            x: 0, y: baseTop + blankTopBase, width: PAGE_WIDTH, height: PAGE_HEIGHT - (imageHeight) - imgOffSet, pdf,
            pageBackgroundColor: this.#data.pageBackgroundColor,
          })
        } else {
          addBlank({
            x: 0, y: blankTopBase, width: PAGE_WIDTH, height: PAGE_HEIGHT - imageHeight, pdf, pageBackgroundColor: this.#data.pageBackgroundColor,
          })
        }
      }
      // 添加页眉
      if (header && pdf.getNumberOfPages() > this.#data.headerSkip) {
        await addHeader({header, pdf, contentWidth, pageBackgroundColor: this.#data.pageBackgroundColor})
      }
      // 添加页脚
      if (footer && pdf.getNumberOfPages() > this.#data.skipPage) {
        await addFooter({
          total: this.#data.totalPage - this.#data.skipPage,
          pageNum: pdf.getNumberOfPages() - this.#data.skipPage,
          footer, pdf, contentWidth,
          pageNowClass: this.#data.pageNumSelector,
          pageTotalClass: this.#data.pageTotalSelector,
          pageBackgroundColor: this.#data.pageBackgroundColor,
        })
      }
      if (this.#progressCallback) {
        this.triggerPageRender(element, (i + 1) / pages.length)
      }
      // 若不是最后一页，则分页
      if (i !== pages.length - 1) {
        // 增加分页
        pdf.addPage()
      }
    }
    /**
     * 返回pdf中剩余空间距离顶部
     */
    return returnValue
  }
  /**
   * 进度 如果元素高度超出canvas最大高度，并且没有设置forcePageTotal(true)则展示高度
   * @param {HTMLElement} ele 当前元素
   * @param {number} currentPageRate 当前元素下分页比例，当前元素渲染当前页占
   */
  triggerPageRender (ele, currentPageRate = 1) {
    const pdf = this.#data.pdf
    const nowHeight = getElementTop(ele) - this.#data.heightOffset + ele.offsetHeight * currentPageRate
    if (this.#data.totalPage) {
      this.#progressCallback(pdf.getNumberOfPages(), this.#data.totalPage)
    } else {
      this.#progressCallback(nowHeight, this.#data.totalHeight)
    }
  }
  /**
   * 设置是否强制获取总页 默认false。仅对于超长内容有效(高度约大于3000像素的)
   * @param {boolean} force 是否强制获取总页
   */
  forcePageTotal (force) {
    this.#data.forceTotalPage = force
    return this
  }
  /**
   * 检查状态
   */
  checkStatus () {
    if (this.#data.stoped) {
      throw new Error("已停止导出")
    }
  }

  assertExport () {
    if (!this.#element) throw new Error("未设置element")
  }

  /**
   * 导出文件
   * @param {string} fileName 文件名 默认"导出.pdf"
   * @returns 导出
   */
  async toPdf (fileName) {
    await this.render()
    return this.#data.pdf.save(!fileName ? "导出.pdf" : (fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`))
  }
  /**
   * 是否开启样式检查，默认开启
   * 开启后会检查每个元素样式，如果存在页面和pdf效果不一致的会在控制台打印警告信息
   * @param {boolean} [enable=true] 是否允许样式检查，默认开启，对导出速度稍微有一些影响
   */
  setStyleCheck (enable = true) {
    this.#data.styleCheckEnable = enable
    return this
  }
  /**
   * 样式检查
   * @private
   * @param {HTMLElement} element
   * @param {boolean} [isBaseElement=false]
   */
  styleCheck (element, isBaseElement) {
    if (this.#data.styleCheckEnable) {
      try {
        checkElementStyle(element, isBaseElement)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("样式检查出错", e)
      }
    }
  }
  /**
   * 调整方向
   * @param {'l'|'p'} orientation 方向 'l' 横向 'p' 纵向
   * @returns {Html2Pdf} pdf实例
   */
  changeOrientation (orientation) {
    this.#data.orientation = orientation
    if (orientation === 'l' && this.#data.contentWidth === 550) {
      this.#data.contentWidth = 800
      this.#data.margin.left = (A4_HEIGHT - 800) / 2
    }
    return this
  }
  /**
   * 获取pdf实例
   * @returns pdf实例
   */
  getPDF () {
    return this.#data.pdf
  }
  /**
   * 执行渲染
   * @param {boolean} force 是否强制渲染，如果执行过一次render需要重新渲染到pdf则设置为true
   * @returns Promise<Html2Pdf>
   */
  async render (force = false) {
    if (this.#data.rendered && !force) {
      throw new Error("已经执行过渲染过, 如果需要重新渲染设置参数force=true")
    }
    this.assertExport()
    this.#data.stoped = false
    // jsPDFs实例
    const pdf = new jsPDF({
      unit: 'pt',
      format: [A4_HEIGHT, A4_WIDTH],
      orientation: this.#data.orientation === 'l' ? 'l' : 'p',
    })

    this.#data.startTime = Date.now()
    this.#data.pdf = pdf
    this.#data.nowHeight = 0
    if (this.#data.forceTotalPage && isElementOverflowCanvas(this.#element)) {
      // 强制获取总页码并且根元素超出canvas最大高度则执行一次非渲染遍历
      this.#data.totalPage = 1
      await this.printElement({element: this.#element, justCalc: true})
      // eslint-disable-next-line no-console
      console.log("计算总页数完成", this.#data.totalPage, `${Math.floor((Date.now() - this.#data.startTime) / 1000)}s`)
    }
    await this.printElement({element: this.#element})
    const durationTime = Date.now() - this.#data.startTime
    // eslint-disable-next-line no-console
    console.log("导出用时", `${Math.floor(durationTime / 1000)}s`, durationTime)
    this.#data.rendered = true
    return this
  }
}
/**
 * 创建生成pdf对象
 * @param {HTMLElement} element 要生成pdf的页面元素
 * @returns void
 */
export const createPDF = (element) => new Html2Pdf(element)
