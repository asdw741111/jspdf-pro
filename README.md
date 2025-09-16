# js生成pdf
基于`jspdf`、`html2canvas`

特性:
- 对任意前端元素导出pdf
- 对长内容自动分页
- 支持不跨页元素自动处理，例如table的row（如果是antd或者element-ui的表格支持通过class控制）
- 支持自定义class实现手动控制分页点、不跨页、不需要向下遍历
- 内容过长会自动拆分处理避免超出canvas高度页面空白
- 支持配置页眉
- 支持配置页脚，并支持根据dom选择器填充当前页码和总页码

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

// 自定义宽度
createPDF(document.getElementById("pdf"))
  .contentWidth(400)
  .toPdf("自定义宽度.pdf")
```

### 高级配置示例
```js
import { createPDF } from "jspdf-pro"

// 完整配置示例
const pdf = createPDF(document.getElementById("pdf-container"))
  .contentWidth(500) // 设置内容宽度
  .margin({left: 30, top: 40, bottom: 30}) // 设置边距
  .header(document.getElementById("custom-header"), {skipPage: 1}) // 设置页眉，跳过第一页
  .footer(document.getElementById("custom-footer"), {
    skipPage: 1,
    pageNumSelector: '.current-page',
    pageTotalSelector: '.total-pages'
  }) // 设置页脚
  .setClassControlFilter("isLeafWithoutDeepFilter", (v) =>
    ["el-table__row", "ant-table-row", "table-row"].includes(v)
  ) // 表格行跨页处理
  .setStyleCheck(true) // 开启样式检查
  .setPageBackgroundColor("#ffffff") // 页面背景色
  .setContentBackgroundColor("#f9f9f9") // 内容区域背景色
  .onProgress((currentPage, totalPages) => {
    console.log(`导出进度: ${currentPage}/${totalPages} (${(currentPage/totalPages*100).toFixed(1)}%)`)
  })

// 执行导出
pdf.toPdf("完整配置示例.pdf").catch(error => {
  console.error("导出失败:", error)
})
```

### 表格导出优化
```js
import { createPDF } from "jspdf-pro"

// Element UI 表格导出
createPDF(document.getElementById("el-table-container"))
  .setClassControlFilter("isLeafWithoutDeepFilter", (v) =>
    ["el-table__row"].includes(v)
  )
  .forcePageTotal(true) // 强制计算总页数，用于表格分页
  .toPdf("Element表格导出.pdf")

// Ant Design 表格导出
createPDF(document.getElementById("ant-table-container"))
  .setClassControlFilter("isLeafWithoutDeepFilter", (v) =>
    ["ant-table-row"].includes(v)
  )
  .toPdf("Ant表格导出.pdf")
```

### 动态内容导出
```js
import { createPDF } from "jspdf-pro"

// 等待动态内容加载完成
async function exportDynamicContent() {
  // 等待数据加载
  await loadData()
  
  // 等待动画完成
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 导出
  createPDF(document.getElementById("dynamic-content"))
    .toPdf("动态内容导出.pdf")
}

// 带用户交互的导出
function exportWithUserConfig() {
  const userConfig = getUserConfig() // 获取用户配置
  
  createPDF(document.getElementById("configurable-content"))
    .contentWidth(userConfig.width || 550)
    .margin({
      left: userConfig.marginLeft || 40,
      top: userConfig.marginTop || 40,
      bottom: userConfig.marginBottom || 20
    })
    .toPdf("用户配置导出.pdf")
}
```

### 批量导出
```js
import { createPDF } from "jspdf-pro"

// 批量导出多个元素
async function batchExport() {
  const elements = document.querySelectorAll('.export-item')
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    const fileName = `导出文件_${i + 1}.pdf`
    
    try {
      await createPDF(element)
        .toPdf(fileName)
      console.log(`成功导出: ${fileName}`)
    } catch (error) {
      console.error(`导出失败: ${fileName}`, error)
    }
    
    // 添加延迟避免内存问题
    if (i < elements.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
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

### 方向设置
```js
import { createPDF } from "jspdf-pro"
// 设置为横向导出
createPDF(document.getElementById("pdf"))
  .changeOrientation('l') // 'l'为横向，'p'为纵向（默认）
  .toPdf("横向导出.pdf")

// 设置为纵向导出（默认）
createPDF(document.getElementById("pdf"))
  .changeOrientation('p')
  .toPdf("纵向导出.pdf")
```

### 取消导出
```js
import { createPDF } from "jspdf-pro"
const pdf = createPDF(document.getElementById("pdf"))
pdf.forcePageTotal(true)
  .margin({left: 40, top: 40, bottom: 20})
  .footer(document.getElementById("footer"), {skipPage: 1})
  .header(document.getElementById("header"), {skipPage: 1})
  .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v)) // 针对element-ui和antd库的表格行样式做跨页处理
  .onProgress((page, total) => {
    // 如果高度超出canvas最大高度page=当前渲染元素到顶部的距离, total=element总高度。如果设置了forcePageTotal(true)则是页数
    console.log("进度", `${(page / total * 100).toFixed(1)}%`)
  }).toPdf("这是文件名.pdf")
  
setTimeout(() => {
  pdf.cancel()
}, 1000)

```

### iframe支持
```js
import { createPDF } from "jspdf-pro"
// 支持iframe元素导出，会自动处理同源iframe
createPDF(document.getElementById("pdf-container"))
  .toPdf("包含iframe的文档.pdf")
```

**iframe处理说明：**
- 支持同源iframe的自动渲染
- 跨域iframe会显示为占位符，包含提示信息
- 如果iframe内容复杂或动态加载，可能需要额外处理

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
- `setStyleCheck` 设置是否导出的时候对样式问题警告，默认警告
- `setPageBackgroundColor` 设置页面背景色，默认白色
- `setContentBackgroundColor` 设置内容区域背景色，不包括上下左右边距、页眉页脚，默认白色
- `cancel` 取消导出，会抛出Error，可以在render函数的catch捕获
- `getPageWidth` 获取PDF页面宽度
- `getPageHeight` 获取PDF页面高度
- `changeOrientation` 调整页面方向，'l'为横向，'p'为纵向
- `getElementCanvasHeight` 获取元素的canvas高度
- `isElementOverflowCanvas` 判断元素是否超出canvas最大高度限制
- `getElementTop` 计算元素距离页面顶部的高度
- `getMargin` 获取元素的上下边距
- `checkElementStyle` 检查元素样式并提供警告信息

### setClassControlFilter说明
用于根据元素class控制是否跨页等，用于想要动态控制或者无法设置为`pdf-break-page`等内置class的情况，支持的过滤器包括：
- **isLeafWithoutDeepFilter**: 叶子节点，整体跨页处理，不再遍历内部元素。可能出现的问题是如果该元素高度超出一页还是会出现截断。优点是不用遍历子元素所以性能好。适用于表格行、图片、canvas等。
- **isLeafWithDeepFilter**: 叶子节点，整体跨页处理，但是会继续遍历内部元素，确保不会出现高度高于一页的元素被截断问题。缺点是速度会慢，建议用于较高的元素，例如一个大章节。

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

### 3. margin重叠
> 注意：文字出现被截断、跨页节点截断等情况很多都是这个原因导致的

当两个相邻的垂直元素分别设置了 margin-bottom 和 margin-top 时，这两个外边距会发生重叠（合并），这种现象在 CSS 中称为 margin collapsing（外边距折叠）。

这是 CSS 盒模型的一个设计特性，主要发生在以下情况：

- 相邻的块级元素
- 垂直方向的外边距（水平方向不会重叠）
- 没有边框、内边距或内容分隔

示例
```html
<div class="box1" style="margin-bottom: 50px;">Box 1</div>
<div class="box2" style="margin-top: 30px;">Box 2</div>
```
实际效果是两个 div 之间的间距是 50px（取两者中较大的值），而不是 50px + 30px = 80px。

Margin 重叠的计算规则:
| 情况  | 计算方式  |
|---|---|
| 两个正数  |  取最大值 |
| 一正一负  |  正值减去负值的绝对值 |
|  两个负数 | 0 - 最大的绝对值  |


如果你不希望外边距重叠，可以使用以下方法：
1. 用padding替代margin
2. 添加边框或内边距: 父节点添加：border-bottom: 1px solid transparent; /* 透明边框 */
3. 使用overflow属性: 父节点添加：overflow: auto; /* 或 hidden */
4. 使用 CSS 的 display: flow-root (父节点添加)

## 性能优化建议

### 1. 关闭样式检查
对于已经测试过的页面，可以关闭样式检查以提高导出速度：
```js
createPDF(document.getElementById("pdf"))
  .setStyleCheck(false) // 关闭样式检查
  .toPdf("优化导出.pdf")
```

### 2. 避免重复渲染
如果需要多次导出同一个内容，可以缓存PDF实例：
```js
const pdf = createPDF(document.getElementById("pdf"))
  .render() // 先渲染但不导出

// 后续可以直接使用
pdf.getPDF().save("导出1.pdf")
pdf.getPDF().save("导出2.pdf")
```

### 3. 合理使用class控制
- 对于不需要深度遍历的元素，使用 `pdf-not-calc-height` 或 `pdf-not-calc-height-group` class
- 对于表格行等元素，使用 `isLeafWithoutDeepFilter` 过滤器
- 避免过深的DOM嵌套

### 4. 控制元素高度
- 单个元素高度建议不超过42000像素（Canvas高度限制）
- 对于超长内容，使用 `forcePageTotal(true)` 提前计算总页数

### 5. 图片优化
- 导出前压缩图片
- 使用合适的图片格式（JPEG通常比PNG更适合PDF）

## 错误处理

### 1. 取消导出
```js
import { createPDF } from "jspdf-pro"

const pdf = createPDF(document.getElementById("pdf"))
pdf.toPdf("测试.pdf").catch(error => {
  if (error.message === "已停止导出") {
    console.log("导出已取消")
  } else {
    console.error("导出失败:", error)
  }
})

// 取消导出
setTimeout(() => {
  pdf.cancel()
}, 1000)
```

### 2. 处理渲染错误
```js
try {
  await pdf.render()
  pdf.getPDF().save("成功.pdf")
} catch (error) {
  console.error("渲染失败:", error)
  // 可以在这里添加重试逻辑
}
```

## 浏览器兼容性

### 支持的浏览器
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### 注意事项
1. **Canvas高度限制**：
   - Chrome/Edge/Firefox: 最大约32,767像素
   - Safari: 最大约16,384像素
   - 本库自动处理超出限制的情况

2. **跨域限制**：
   - 跨域图片需要服务器设置CORS头
   - 跨域iframe无法直接导出内容

3. **内存使用**：
   - 大型文档导出需要较多内存
   - 建议在性能较好的设备上导出复杂文档

## Canvas高度限制说明

由于浏览器Canvas API的限制，单个Canvas的高度有最大值限制：
- **Chrome/Edge/Firefox**: ~32,767px
- **Safari**: ~16,384px

当元素高度超过这些限制时，库会自动进行以下处理：
1. 检测元素是否有子元素
2. 如果有子元素，自动分割处理
3. 如果没有子元素，尝试强制渲染并警告
4. 对于图片等特殊元素，使用分片渲染技术

这个限制是为了确保导出功能在所有浏览器中都能正常工作。

## TODO
- [x] 样式检查避免某些兼容问题导致导出pdf效果不一致
- [x] 页眉页脚如果有部分页面跳过需要特殊处理
