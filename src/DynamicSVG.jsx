import React, { useState, useEffect, createRef, useRef } from 'react'
import { TweenMax, Power3 } from 'gsap/all'
import './App.css'

export default () => {
  const [files, setFiles] = useState(['survey.svg'])
  const [doc, setDoc] = useState()
  const origView = useRef(null)
  const [SVG, setSVG] = useState()
  const keys = useRef([])
  const spaces = useRef([])
  const elems = useRef({})
  const svg = useRef()
  const [tooltip, setTooltip] = useState()
  const tipTimeout = useRef()

  const camelCase = (str, sep = '-') => (
    str.split(sep)
    .map((part, i) => {
      if(i === 0) {
        return part
      } else {
        return part[0].toUpperCase() + part.slice(1)
      }
    })
    .join('')
  )

  const getViewBox = () => {
    const str = svg.current.attributes.viewBox.nodeValue
    const parts = str.split(/\s+/).map(parseFloat)
    return {
      x: parts[0], y: parts[1], width: parts[2], height: parts[3]
    }
  }

  const setViewBox = (box) => {
    if(typeof box !== 'string') {
      box = [box.x, box.y, box.width, box.height].join(' ')
    }
    svg.current.setAttribute('viewBox', box)
  }

  // // dispatched events go to all parents, propagated events go to all children
  // const propogateEvent = (type, ref) => {
  //   const evt = new CustomEvent(type, {
  //     bubbles: false,
  //     detail: { text: () => type }
  //   })
  //   ref.current.dispatchEvent(evt)
  //   eventChildren(evt, ref.current)
  // }

  const eventChildren = (evt, target) => {
    for(let child of [...target.childNodes]) {
      if(child.dispatchEvent) {
        child.dispatchEvent(evt)
        eventChildren(evt, child)
      }
    }
  }
  
  const cleanAttributes = (attributes) => {
    const attrs = {}
    for(let attr of attributes) {
      attrs[attr.nodeName] = attr.nodeValue
    }

    if(attrs.style) {
      const style = {}
      for(let elem of attrs.style.split(';')) {
        let [prop, val] = elem.split(':')
        prop = camelCase(prop, '-')
        style[prop] = val
      }
      attrs.style = style
    }

    if(attrs.class) {
      attrs.className = attrs.class
      delete attrs.class
    }
    for(let attr of ['xml:space', 'xlink:href', 'xmlns:xlink']) {
      if(attrs[attr]) {
        attrs[camelCase(attr, ':')] = attrs[attr]
        delete attrs[attr]
      }
    }
    for(let attr of ['flood-opacity', 'flood-color']) {
      if(attrs[attr]) {
        attrs[camelCase(attr, '-')] = attrs[attr]
        delete attrs[attr]
      }
    }

    return attrs
  }

  const svgPoint = (x, y) => {
    let point = svg.current.createSVGPoint()
    point.x = x
    point.y = y
    return point
  } 

  const zoomedBox = (elem, opts = {}) => {
    const { padPercent = 2, serialize = true } = opts
    let box = elem.getBBox()
    if(elem.nodeType === 'rect') {
      box = {
        x: elem.attributes.x, y: elem.attributes.y,
        width: elem.attributes.width, height: elem.attributes.height,
      }
    }
    const tfm2elm = (
      svg.current.getScreenCTM().inverse().multiply(elem.getScreenCTM())
    )
    const pad = (padPercent / 100) * Math.min(box.width, box.height)
    const upLeft = svgPoint(box.x - pad, box.y - pad)
    const lowRight = svgPoint(
      box.x + box.width + 2 * pad, box.y + box.height + 2 * pad
    )
    const tUpLeft = upLeft.matrixTransform(tfm2elm)
    const tLowRight = lowRight.matrixTransform(tfm2elm)
    const dest = {
      x: tUpLeft.x, y: tUpLeft.y,
      width: tLowRight.x - tUpLeft.x,
      height: tLowRight.y - tUpLeft.y,
    }
    
    const upRight = svgPoint(lowRight.x, upLeft.y)
    const tUpRight = upRight.matrixTransform(tfm2elm)
    const slope = (tUpLeft.y - tUpRight.y) / (tUpLeft.x - tUpRight.x)
    console.info(tUpLeft, tUpRight, tLowRight, Math.atan(slope))

    if(serialize) {
      return [dest.x, dest.y, dest.width, dest.height].join(' ')
    } else {
      return dest
    }
  }

  const zoomTo = (elem) => {
    let newView = zoomedBox(elem)
    if(newView === svg.current.attributes.viewBox.nodeValue) {
      newView = origView.current
    }
    TweenMax.to(
      svg.current, 1, { attr: { viewBox: newView }, ease: Power3.easeInOut }
    )
  }

  const setKeyTo = (to) => {
    to = to.replace(/^#/, '')
    for(let key of keys.current) {
      const anchors = (
        [...key.current.childNodes]
        .filter(c => c.attributes && c.attributes['xlink:href'])
      )
      const links = (
        anchors
        .map(c => c.attributes['xlink:href'].nodeValue.replace(/^#/, ''))
      )

      if(links.includes(to)) {
        for(let anchor of anchors) {
          if(!anchor.classList) continue

          const id = anchor.attributes['xlink:href'].nodeValue.replace(/^#/, '')
          const elem = elems.current[id] && elems.current[id].current
          const visible = id === to

          if(visible) {
            anchor.classList.add('active')
          } else {
            anchor.classList.remove('active')
          }

          TweenMax.to(
            elem, 0.5, {
              display: visible ? 'inline' : 'none',
              opacity: visible ? 1 : 0,
              ease: Power3.easeInOut,
            }
          )
        }
      }
    }
  }

  const clickShow = (clicked, key) => {
    if(clicked === key) return
    while(clicked.parentNode !== key) {
      clicked = clicked.parentNode
    }
    if([...clicked.classList].includes('active')) {
      // Do what?
    } else {
      setKeyTo(clicked.attributes['xlink:href'].nodeValue)
    }
  }

  const buildTree = (root, key = { val: 0 }) => {
    if(root.nodeType !== Node.ELEMENT_NODE) {
      console.error('Root Type', root.nodeType)
    } else {
      const children = []
      for(let child of root.childNodes) {
        if(child.nodeType === Node.ELEMENT_NODE) {
          if(
            child.childNodes.length === 0
            || [...child.childNodes].find(
              sub => sub.nodeType !== Node.TEXT_NODE
            )
          ) {
            children.push(buildTree(child, key))
          } else {
            const attrs = cleanAttributes(child.attributes)
            attrs.key = ++key.val

            const text = [...child.childNodes].map(c => c.data).join()
            children.push(React.createElement(
              child.nodeName, attrs, text
            ))
          }
        } else if(child.data && child.data.trim() !== '') {
          console.error('Child', child.data)
        }
      }
      const attrs = cleanAttributes(root.attributes)
      attrs.key = ++key.val

      const ref = (root.nodeName === 'svg') ? svg : createRef()
      attrs.ref = ref

      if(attrs.id) {
        elems.current[attrs.id] = attrs.ref
      }

      if(['space'].includes(attrs.className)) {
        attrs.onClick = () => zoomTo(ref.current)
      }

      if(['parent'].includes(attrs.className)) {
        attrs.onClick = () => {
          attrs.ref.current.classList.add('selected')

          console.info('RT', attrs.ref.current.childNodes)

          let newView = zoomedBox(ref.current)
          const card = attrs.ref.current.querySelector('.card')
          if(card) {
            newView = zoomedBox(card, { padPercent: 0 })
            console.info('BX', newView)
          }

          // TweenMax.to(
          //   svg.current, 1.75,
          //   {
          //     attr: { viewBox: newView },
          //     ease: Power3.easeOut,
          //   }
          // )
          let txElem = svg.current
          if(elems.current['root']) {
            txElem = elems.current['root'].current
          }
          // TweenMax.to(
          //   txElem, 1.5,
          //   {
          //     style: { opacity: 0 },
          //     ease: Power3.easeInOut,
          //     delay: 0.25,
          //     //onComplete: () => setFiles(f => [attrs.xlinkHref, ...f]),
          //   }
          // )
        }
      }

      if(attrs.style && attrs.style.display === 'none') {
        attrs.style.opacity = 0
      }

      if(attrs['inkscape:label']) {
        children.unshift(<title key={++key.val}>{attrs['inkscape:label']}</title>)
      }

      if(attrs['inkscape:label'] === 'space') {
        spaces.current.push(attrs.ref)
      }

      if(['key'].includes(attrs.className)) {
        keys.current.push(attrs.ref)
        attrs.onClick = (evt) => clickShow(evt.target, attrs.ref.current)
      }

      if(['link'].includes(attrs.className)) {
        attrs.onClick = () => {
          const dest = attrs.xlinkHref
          if(dest.startsWith('#')) {
            setKeyTo(dest)
          } else {
            setFiles(fs => [dest, ...fs])
          }
        }
      }

      let transform = attrs['selected:transform']
      if(transform) {
        const prevClick = attrs.onClick
        attrs.onClick = (evt) => {
          if(prevClick) prevClick(evt)

          // TweenMax.to(
          //   attrs.ref.current, 1,
          //   {
          //     attr: { transform: transform },
          //     ease: Power3.easeOut,
          //   }
          // )
        }
      }

      let rootTransform = attrs['selected:transform-root']
      if(rootTransform) {
        const prevClick = attrs.onClick
        attrs.onClick = (evt) => {
          if(prevClick) prevClick(evt)

          let txElem = svg.current
          if(elems.current['root']) {
            txElem = elems.current['root'].current
          }
          TweenMax.to(
            txElem, 10.75,
            {
              attr: { transform: rootTransform },
              ease: Power3.easeOut,
            }
          )
        }
      }

      if(['toggle'].includes(attrs.className)) {
        const handler = () => {
          attrs.ref.current.classList.toggle('on')
          for(let space of spaces.current) {
            const visible = space.current.style.opacity !== '0'
            TweenMax.to(
              space.current, 0.5,
              {
                display: visible ? 'none' : 'inline',
                opacity: visible ? 0 : 1,
                ease: Power3.easeInOut
              }
            )
          }
        }
        window.addEventListener(
          'keypress', (evt) => { if(evt.key === 's') handler() }
        )
        attrs.onClick = handler
      }

      const prevClick = attrs.onClick
      attrs.onClick = (evt) => {
        if(prevClick) prevClick(evt)

        let node = evt.target
        while(node.parentNode && !node.attributes['inkscape:label']) {
          node = node.parentNode
        }
        if(!node || !node.attributes) {
          setTooltip('')
        } else {
          node.classList.add('clicked')
          setTimeout(() => node.classList.remove('clicked'), 1000)
          setTooltip(node.attributes['inkscape:label'].nodeValue)
          if(tipTimeout.current) {
            clearTimeout(tipTimeout.current)
          }
          tipTimeout.current = setTimeout(() => setTooltip(), 5000)
        }
      }

      const elem = React.createElement(
        root.nodeName, attrs, children
      )

      return elem
    }
  }

  const loadDoc = async (filename) => {
    const res = await fetch(filename)
    if(res.status >= 200 && res.status < 300) {
      setDoc(await res.text())
    } else {
      alert(`Couldn't Load: ${filename}`)
    }
  }

  const back = () => {
    setFiles(f => f.slice(1))
  }

  useEffect(() => { loadDoc(files[0]) }, [files])

  useEffect(() => {
    if(doc) {
      try {
        const dom = (new DOMParser()).parseFromString(doc, 'text/xml')
        keys.current = []
        spaces.current = []
        origView.current = dom.documentElement.attributes.viewBox.nodeValue
        elems.current = {}
        setSVG(buildTree(dom.documentElement))
      } catch(err) {
        alert(`Error Loading: ${files[0]}`)
        console.error(err)
        console.error(doc)
      }
    }  
  }, [doc]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for(let key of keys.current) {
      for(let anchor of [...key.current.childNodes]) {
        if(!anchor.attributes) continue
        const id = anchor.attributes['xlink:href'].nodeValue.replace(/^#/, '')
        if(elems.current[id].current.style.opacity !== '0') {
          setKeyTo(id)
        }
      }
    }
  }, [SVG])

  useEffect(() => {
    const handler = (evt) => {
      let view = getViewBox()
      const mult = (evt.altKey ? 0.025 : 0.1) * (evt.deltaY / Math.abs(evt.deltaY))
      if(evt.shiftKey) { // pan
        view.x += view.width * mult
      } else if(evt.ctrlKey) { // zoom
        evt.preventDefault()

        const point = svg.current.createSVGPoint()
        point.x = evt.clientX
        point.y = evt.clientY
        const viewPoint = point.matrixTransform(svg.current.getScreenCTM().inverse())
        const d = { x: viewPoint.x - view.x, y: viewPoint.y - view.y }
        const newView = {
          width: view.width * (1 - mult), height: view.height * (1 - mult)
        }
        const dPrime = {
          x: newView.width * (d.x / view.width),
          y: newView.height * (d.y / view.height),
        }
        newView.x = viewPoint.x - dPrime.x
        newView.y = viewPoint.y - dPrime.y
        view = newView
      } else { // scroll
        view.y += view.height * mult
      }
      setViewBox(view)
    }
  
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    const handler = (evt) => {
      if(evt.key === 'Enter') {
        setViewBox(origView.current)
      }
    }
    window.addEventListener('keypress', handler)
    return () => window.removeEventListener('keypress', handler)
  }, [])


  return (
    <div id='App'>
      {SVG}
      {tooltip && <h1>{tooltip}</h1>}
      {files.length > 1 &&
        <button id='back' onClick={back}>
          <span role='img' aria-label='Close'>❌</span>
        </button>
      }
    </div>
  )
}
