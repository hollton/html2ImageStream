# html2-image-stream html转成图片流

## 安装使用

### npm
```
npm install html2-image-stream  --save

import {html2ImageStream} from 'html2-image-stream'
html2ImageStream()
```

### script
```
<script src="index.js"></script>

const {html2ImageStream} = window.html2ImageStream
html2ImageStream()
```

#### params
* selector: 'string', // 类选择器，指定下载dom
* handleBack: function // 回调
#### return
* res: {
    type: 'string', // 'success'成功，'error'错误
    data: ['imageStream',...], // type==='success'时返回图片流信息，type==='error'返回错误信息
}
```
html2ImageStream('.selector', function(res){
    // 
})
```
