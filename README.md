# js生成pdf
基于`jspdf`、`html2canvas`

特性:
- 对任意前端元素导出pdf
- 对长内容自动分页
- 支持不跨页元素自动处理
- 支持自定义class实现手动控制分页点、不跨页、不需要向下遍历
- 内容过长会自动拆分处理避免超出canvas高度页面空白


## 安装
```sh
npm install jspdf-pro
```
or
```sh
yarn add jspdf-pro
```

## 使用
通过`createPDF`方法创建导出pdf实例，并进行配置后执行`toPdf`导出文件

### 基本导出
```js
import { createPDF } from "jspdf-pro"
// 导出 内容区域宽度默认550
createPDF(document.getElementById("pdf")).toPdf("这是文件名.pdf")
```

### 带页眉页脚导出
```js
import { createPDF } from "jspdf-pro"
// 渲染pdf并导出文件 带页眉和页脚
createPDF(document.getElementById("pdf"))
  .forcePageTotal(true)
  .margin({left: 40, top: 40, bottom: 20})
  .footer(document.getElementById("footer"), {skipPage: 1})
  .header(document.getElementById("header"), {skipPage: 1})
  .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v)) // 针对element-ui和antd库的表格行样式做跨页处理
  .onProgress((page, total) => {
    // 如果高度超出canvas最大高度page=当前渲染元素到顶部的距离, total=element总高度。如果设置了forcePageTotal(true)则是页数
    console.log("进度", `${(page / total * 100).toFixed(1)}%`)
  }).toPdf("这是文件名.pdf")

// 只渲染pdf并获取jsPDF实例
document.getElementById("export").onclick = () => {
  createPDF(document.getElementById("pdf"))
    .render().then((obj) => obj.getPDF().save("save.pdf"))
}
```

### 工具函数
```js
import { calcElementSizeInPDF, calcHtmlSizeByPdfSize, getHtmlToPdfPixelRate} from "jspdf-pro"

// 根据要再pdf中的尺寸计算在html中应当是多少像素，pdfSize=在pdf中的像素数
const htmlHeight = calcHtmlSizeByPdfSize({
      pdfSize: 20,
      element: document.getElementById("pdf"),
      marginLeft: 45, marginRight: 16,
    })
```

函数说明
- `calcElementSizeInPDF` 计算html元素在pdf中的像素数
- `calcHtmlSizeByPdfSize` 根据要在pdf中渲染的像素数，计算应当在html中对应的像素数，一般用于页眉和页脚尺寸控制
- `getHtmlToPdfPixelRate` 获取页面元素渲染到pdf中尺寸的比例

pdf实例方法说明
- `forcePageTotal` 强制获取总页数, 用于需要设置页脚并且导出区域超出canvas最大高度的情况，注意：**如果不需要渲染总页数，则无需设置，否则会导致为了获取总页数需要提前计算一遍从而导出时间加倍**
- `contentWidth` 设置pdf宽度, 根据A4尺寸应当小于`595.266`, 默认`550`
- `header` 设置页眉元素。可选参数：{skipPage: 要跳过的页数，例如第一页是封面，第二页是目录，从第三页开始页脚显示则设置2}
- `footer` 设置页脚元素。可选参数：{skipPage: 要跳过的页数，例如第一页是封面，第二页是目录，从第三页开始页脚显示则设置2, pageNumSelector: 当前页选择器, pageTotalSelector: 总页码选择器}
- `setClassControlFilter` 设置用于控制的class， 包括另起一页、整体跨页、整体不考虑跨页(不需要遍历子元素提高导出速度)，详见方法说明
- `onProgress` 进度回调，每页渲染后回调一次，包含当前页数也总页数，页数不受`skipPage`影响
- `toPdf` 导出pdf
- `aliaClass` 进行样式控制的class别名，包含跨页、分页、整体不需要深度遍历等，默认class详见[PDF控制class](#pdf控制class)
- `margin` 单独设置上下左右边距，边距默认为0，如果不设置左右边距会根据`contentWidth`自动计算内容居中。可以只设置`left`和`contentWidth`自动计算右边距
- `render` 手动执行pdf渲染，参数force用于配置是否重新渲染
- `getPDF` 获取jspdf对象实例

### PDF控制class
支持通过html的`class`来控制特殊效果，例如从此处换页、需要保持完整，完整列表如下
- `pdf-break-page` 换页，该元素从新的一页开始，如果是第一页的第一个元素则无效
- `pdf-not-calc-height` 不需要深度遍历计算，将该元素整体渲染，不考虑跨页，可能导致剩余高度不够剩下的部分会到下一页
- `pdf-not-calc-height-group` 不需要深度遍历计算，将该元素整体渲染，考虑跨页，如果剩余高度不够则会整体渲染到下一页
- `pdf-scroll` 该元素有滚动条(内部高度大于自身高度或者宽度)，会在渲染时先展开滚动区域确保完整渲染后再恢复原样
- `pdf-footer-page` 页脚元素内的当前页元素，在渲染页脚时生效
- `pdf-footer-page-total` 页脚元素内总页数元素，在渲染页脚时生效

## 生成PDF样式问题汇总
### 1. z-index无效
html2canvas在绘制div到img时忽略了z索引，只遵循div的顺序，所以会导致有些导出效果也页面不一致，解决方案：将zindex元素和所有兄弟元素设置position:relative

### 2. margin-top塌陷
这是css盒子模型问题，如果一个元素前边没有兄弟元素，给它设置了margin-top本意是距离父元素有间距，但是间距效果会到父元素上。解决办法是给父元素设置overflow:hidden


## TODO
- [ ] 样式检查避免某些兼容问题导致导出pdf效果不一致
- [x] 页眉页脚如果有部分页面跳过需要特殊处理
