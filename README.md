# html2ImageStream html转成图片流

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
