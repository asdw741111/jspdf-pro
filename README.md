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
```js
import { createPDF } from "jspdf-pro"
// 导出
document.getElementById("export").onclick = () => {
  createPDF(document.getElementById("pdf"))
    .forcePageTotal(true)
    .footer(document.getElementById("footer"), {skipPage: 1})
    .setClassControlFilter("isLeafWithoutDeepFilter", (v) => ["el-table__row", "ant-table-row"].includes(v))
    .onProgress((page, total) => {
      console.log("progress", page, total)
    }).toPdf("这是文件名.pdf")
}
```

pdf实例方法说明
- `forcePageTotal` 强制获取总页数, 用于需要设置页脚并且导出区域超出canvas最大高度的情况
- `contentWidth` 设置pdf宽度, 根据A4尺寸应当小于`595.266`, 默认`550`
- `header` 设置页眉元素
- `footer` 设置页脚元素。可选参数：{skipPage: 要跳过的页数，例如第一页是封面，第二页是目录，从第三页开始页脚显示则设置2}
- `setClassControlFilter` 设置用于控制的class， 包括另起一页、整体跨页、整体不考虑跨页(不需要遍历子元素提高导出速度)，详见方法说明
- `onProgress` 进度回调，每页渲染后回调一次，包含当前页数也总页数，页数不受`skipPage`影响
- `toPdf` 导出pdf
- `aliaClass` 进行样式控制的class别名，包含跨页、分页、整体不需要深度遍历等

## 生成PDF样式问题汇总
### 1. z-index无效
html2canvas在绘制div到img时忽略了z索引，只遵循div的顺序，所以会导致有些导出效果也页面不一致，解决方案：将zindex元素和所有兄弟元素设置position:relative

### 2. margin-top塌陷
这是css盒子模型问题，如果一个元素前边没有兄弟元素，给它设置了margin-top本意是距离父元素有间距，但是间距效果会到父元素上。解决办法是给父元素设置overflow:hidden


## TODO
- [ ] 样式检查避免某些兼容问题导致导出pdf效果不一致
- [ ] 页眉页脚如果有部分页面跳过需要特殊处理
