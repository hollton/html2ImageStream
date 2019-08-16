/**
 * @function html转成图片流
 * @authors  hollton (holltonliu@163.com)
 * @date     2019-08-08 11:23:51
 * @params
 *   selector: 'string', // 类选择器，指定下载dom
 *   handleBack: function({ // 回调
 *      type: 'string', // 'success'成功，'error'错误
 *      data: ['imageStream',...], // type==='success'时返回图片流信息，type==='error'返回错误信息
 *   })
 */

import $ from 'jquery'
import createCanvas from './createCanvas'

var clickAllow = true
var props = {}
var state = {}

const initData = function () {
  state = {
    domCount: 0,
    eventNodeCount: 0,
    eventQueue: [],
    store: [],
    imgsList: [],
    screenshotDoms: []
  }
}

const html2ImageStream = (selector, handleBack) => {
  props = {
    selector,
    handleBack
  }
  if (!clickAllow) {
    return
  } else {
    clickAllow = false
  }
  initData()
  state.screenshotDoms = getScreenshotDoms(selector)
  if (!state.screenshotDoms || state.screenshotDoms.length === 0) {
    handleFinally({
      type: 'error',
      data: '暂无报告'
    })
    return
  }
  // 截图之前移除IE下载创建的临时iframe，防止html2canvas截图触发下载
  const iframes = document.getElementsByTagName('iframe')
  for (let i = 0; i < iframes.length; i++) {
    document.body.removeChild(iframes[i])
  }
  triggerCreate(state.screenshotDoms, 0)
}

const handleFinally = payload => {
  clickAllow = true
  props.handleBack({
    type: payload.type,
    data: payload.data
  })
}

// 获取实际需要截取dom，过滤download-hide
const getScreenshotDoms = selector => {
  return $(selector).filter((index, dom) => {
    return $(dom).not('.download-hide').length
  })
}

const triggerCreate = (screenshotDomList, index) => {
  var screenshotDom = screenshotDomList[index]
  var nodeInfo = getNodeInfo(screenshotDom)
  var nodeEventType = nodeInfo.eventType
  var isLastEventType = nodeEventType.indexOf('last') !== -1

  var handleTriggerCreate = function () {
    setTimeout(function () {
      triggerCreate($(screenshotDom), 0)
    }, 500)
  }

  if (state.eventNodeCount < nodeInfo.nodeList.length && state.eventNodeCount === 0) {
    triggerEvent(
      nodeEventType,
      nodeInfo.nodeList[state.eventNodeCount],
      handleTriggerCreate
    )
    // 原设计是触发click后将下个'screenshot-click-last'改为'screenshot-click'，以便下次getNodeInfo可触发click，此种无法实现多个'screenshot-click-last'
    // 现将触发后将本次改为'screenshot-click-none'，下次getNodeInfo不参与筛选
    // 依旧使用store存储，下载完成后还原类名
    if (isLastEventType) {
      var storeItem = {}
      nodeInfo.nodeList[state.eventNodeCount].className = nodeInfo.nodeList[state.eventNodeCount].className.replace(/(\S*-last)/g, function (match) {
        storeItem.oldClassName = match
        storeItem.newClassName = match.replace('-last', '-none')
        return storeItem.newClassName
      })
      storeItem.node = nodeInfo.nodeList[state.eventNodeCount]
      state.store.push(storeItem)
    }
    state.eventNodeCount++
    return
  }

  createImage(screenshotDom).then(
    function () {
      if (isLastEventType) {
        state.eventQueue.push(nodeInfo)
      } else if (state.eventNodeCount < nodeInfo.nodeList.length) {
        triggerEvent(
          nodeEventType,
          nodeInfo.nodeList[state.eventNodeCount],
          handleTriggerCreate
        )
        // 针对已设置'screenshot-weight'权重，根据权重重置eventNodeCount
        // 参见 esp-simple-extend-bar 指令，遍历完成子元素，回溯兄弟元素时需重置根据兄弟元素权重设置eventNodeCount
        // 否则eventNodeCount会累加到超出所有可触发节点
        var weight = $(nodeInfo.nodeList[state.eventNodeCount]).attr(
          'screenshot-weight'
        )
        if (weight) {
          state.eventNodeCount = weight.split('-').reduce(function (curr, next) {
            return parseInt(curr) + parseInt(next)
          })
        }
        state.eventNodeCount++
        return
      }
      state.domCount++
      state.eventNodeCount = 0
      state.screenshotDoms = getScreenshotDoms(props.selector)
      if (state.domCount < state.screenshotDoms.length) {
        triggerCreate(state.screenshotDoms, state.domCount)
      } else if (state.eventQueue.length > 0) {
        var _queueNode = state.eventQueue[0]
        triggerEvent(
          _queueNode.eventType,
          _queueNode.nodeList[0],
          handleTriggerCreate
        )
        state.eventQueue.shift()
        state.domCount = 0
        state.eventNodeCount = 0
      } else {
        state.store.forEach(function (item) {
          item.node.className = item.node.className.replace(
            item.newClassName,
            item.oldClassName
          )
        })
        handleFinally({
          type: 'success',
          data: state.imgsList
        })
        clickAllow = true
      }
    }, function (err) {
      handleFinally({
        type: 'error',
        data: '生成报告错误！请重试！'
      })
      console.log(err)
      clickAllow = true
    }
  )
}

const createImage = screenshotDom => {
  if (!$(screenshotDom).is(':hidden')) {
    return createCanvas($(screenshotDom)).then(function (canvas) {
      const image = canvas.toDataURL()
      if (image) {
        state.imgsList.push(image)
      }
      return image
    })
  }
  return Promise.resolve(undefined)
}
var SCREENSHOT_EVENT_CLICK = '.screenshot-click'
var SCREENSHOT_EVENT_CLICK_LAST = '.screenshot-click-last'
var getNodeInfo = function (el) {
  var eventList = [SCREENSHOT_EVENT_CLICK, SCREENSHOT_EVENT_CLICK_LAST]
  var eventType = eventList[0]
  for (var i = 0; i < eventList.length; i++) {
    var event = eventList[i]
    var eventNodes = $(el).find(event)
    if (eventNodes.length) {
      eventType = event
      break
    }
  }

  return {
    eventType: eventType,
    nodeList: eventNodes
  }
}

var isSendHttp = false
var triggerEvent = function (event, el, afterAction) {
  var defer = $.Deferred()
  isSendHttp = false

  switch (event) {
    case SCREENSHOT_EVENT_CLICK:
      eventClick(el)
      break
    case SCREENSHOT_EVENT_CLICK_LAST:
      eventClick(el)
      break
    default:
      break
  }

  var handleLoadAllHttpEvent = function () {
    afterAction()
    isSendHttp = false
    window.removeEventListener('loadAllHttpEvent', handleLoadAllHttpEvent)
    defer.resolve()
  }

  var handleSendHttp = function () {
    isSendHttp = true
    window.removeEventListener('openHttpEvent', handleSendHttp)
    defer.resolve()
  }

  window.addEventListener('openHttpEvent', handleSendHttp)

  setTimeout(function () {
    if (!isSendHttp) {
      afterAction()
      defer.resolve()
    } else {
      window.removeEventListener('loadAllHttpEvent', handleLoadAllHttpEvent)
      window.addEventListener('loadAllHttpEvent', handleLoadAllHttpEvent)
    }
  }, 100)

  return defer.promise()
}

var eventClick = function (el) {
  el.click()
}

export {html2ImageStream}
export default html2ImageStream
