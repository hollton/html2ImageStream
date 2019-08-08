import $ from "jquery"
import canvg from 'canvg'
import html2canvas from 'html2canvas'

// 将指定的节点转换为图片
const createCanvas = $dom => {
  var defer = $.Deferred()
  // 如果canvas在30s内没生成出来 当作错误处理
  setTimeout(function () {
    defer.reject('create canvas timeout')
  }, 30000)
  var gifImages
  convertImgTagToDataUrl($dom.selector)
    .then(function (imgs) {
      gifImages = imgs
      // 新版支持 svg 所以不需要做处理，但是IE下不支持，所以需要将svg转为图片
      if (isIE()) {
        return covertSvgDomToImageDom($dom)
      }
      return $dom
    })
    .then(
      function (svgBackup) {
        // 放大倍数。用来解决截图模糊的问题。放大越多越清晰。有效的dom长度如果超过了一定长度，不进行放大，暂时长度为25
        return html2canvas($dom[0], {
          logging: false,
          allowTaint: false,
          useCORS: true,
          height: $dom.outerHeight(true) || 1, // 高度为0会导致canvas截图超时
          width: $dom.outerWidth(true) + 2, // 加上panel容器边框宽度
          scale: 2
        })
          .then(function (canvas) {
            if (gifImages) {
              for (var i = 0; i < gifImages.length; i++) {
                gifImages[i].dom.attr('src', gifImages[i].src)
              }
            }
            if (svgBackup) {
              for (var j = 0; j < svgBackup.length; j++) {
                $(svgBackup[j].dom).remove()
                $(svgBackup[j].htmlBackUp).show()
              }
            }
            defer.resolve(canvas)
          })
          .catch(function (e) {
            console.log(e)
            defer.reject(e)
          })
      },
      function (e) {
        defer.reject('convert ImgTag to DataUrl fail, can not create canvas.')
      }
    )
  return defer.promise()
}
/**
 * 将svg类型Dom转换为image Dom
 * @param selector
 * @returns {*}
 */
var covertSvgDomToImageDom = function ($dom) {
  var defer = $.Deferred()
  var svgBackup = []
  var svgs = $dom.find('svg')
  if (svgs.length > 0) {
    var promises = []
    svgs.forEach(function (svg) {
      promises.push(function () {
        return svgToImage(svg, svgBackup)
      })
    })
    return promises
      .reduce(function (result, promise) {
        return result.then(promise)
      }, Promise.resolve())
      .then(() => {
        return svgBackup
      })
  } else {
    defer.resolve(svgBackup)
  }
  return defer.promise()
}

// 用html2canvas方法将svg转换为图片
var svgToImage = function (svg, svgBackup) {
  var defer = $.Deferred()
  var canvas = document.createElement('canvas') // 准备空画布
  try {
    var svgXml = new XMLSerializer().serializeToString(svg)
    canvg(canvas, svgXml)
    var $svg = $(svg)
    var img = document.createElement('img')
    img.src = canvas.toDataURL('image/png')
    $svg.after(img)
    $svg.hide()
    svgBackup.push({
      // 保存替换前后的dom
      dom: $(img),
      htmlBackUp: $svg
    })
    defer.resolve() // 将画布内的信息导出为png图片数据
  } catch (err) {
    defer.reject()
  }

  return defer.promise()
}

var isIE = () => {
  var ua = navigator.userAgent
  var ieReg = /MSIE\ (\d+)|rv:(11)\.0/gi
  return ieReg.test(ua)
}

/**
 * convertImgTagToDataUrl 转换指定元素的后代元素中的img元素的src为data url
 * @param  {string} selector jquery selector,默认值 .main-wrap .j-mine-canvas
 * @return {promise}
 */
var convertImgTagToDataUrl = function (selector) {
  var defer = $.Deferred()
  // 未转成dataurl的图片需要转换 否则html2canvas中会报跨域错误
  var gifImages = []
  var images = []
  images.forEach(function (img) {
    if (/\.[git|png|jpe?g]/.test(img.src)) {
      images.push(img)
    }
  })
  if (images.length > 0) {
    (function replaceImgUrlToDataUrl (images, count) {
      var imgSrc = $(images[count]).attr('src')
      if (typeof imgSrc === 'string' && imgSrc.indexOf('.gif') !== -1) {
        gifImages.push({
          dom: $(images[count]),
          src: imgSrc
        })
      }
      var image = document.createElement('img')
      image.crossOrigin = ''
      image.onload = function () {
        try {
          var canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          var context = canvas.getContext('2d')
          context.drawImage(this, 0, 0)
          var imageData = context.getImageData(0, 0, image.width, image.height) // PROBLEM HERE
          context.putImageData(imageData, 0, 0)
          var dataURL = canvas.toDataURL('image/png')
          $(images[count]).attr('src', dataURL)
        } catch (err) {
          defer.reject('convert to dataURL fail')
        }

        if (count > 0) {
          replaceImgUrlToDataUrl(images, count - 1)
        } else {
          defer.resolve(gifImages)
        }
      }
      image.onerror = function () {
        defer.reject('load image fail. please check the url is correct !')
      }
      image.src = images[count].src
    })(images, images.length - 1)
  } else {
    defer.resolve(gifImages)
  }
  return defer.promise()
}

export default createCanvas
