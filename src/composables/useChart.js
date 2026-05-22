export function useChart() {
  function drawProfessionalChart(canvas, dataArr, isMini = false, hoverIdx = null, isLightTheme = false, isMasterIndex = false) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!dataArr || dataArr.length < 2) return

    const max = Math.max(...dataArr)
    const min = Math.min(...dataArr)
    const start = dataArr[0]
    const end = dataArr[dataArr.length - 1]
    const isUp = end >= start
    const color = isUp ? (isLightTheme ? '#16a34a' : '#00ff66') : (isLightTheme ? '#dc2626' : '#ff3333')
    const pad = (max - min) === 0 ? 1 : (max - min) * 0.15
    const yMin = min - pad
    const yMax = max + pad
    const getY = v => canvas.height - ((v - yMin) / (yMax - yMin)) * canvas.height
    const getX = i => (i / (dataArr.length - 1)) * canvas.width

    if (!isMini) {
      ctx.strokeStyle = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 1; i < 5; i++) {
        const y = (canvas.height / 5) * i
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
      }
      for (let i = 1; i < 10; i++) {
        const x = (canvas.width / 10) * i
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
      }
      ctx.stroke()
    }

    if (!isMini && dataArr.length > 5) {
      ctx.strokeStyle = 'rgba(255,204,0,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      const p = Math.max(2, Math.floor(dataArr.length / 10))
      for (let i = p; i < dataArr.length; i++) {
        let sum = 0
        for (let j = 0; j < p; j++) sum += dataArr[i - j]
        const avg = sum / p
        if (i === p) ctx.moveTo(getX(i), getY(avg))
        else ctx.lineTo(getX(i), getY(avg))
      }
      ctx.stroke()
    }

    ctx.strokeStyle = color
    ctx.lineWidth = isMini ? 1.5 : 2.5
    ctx.beginPath()
    dataArr.forEach((v, i) => {
      if (i === 0) ctx.moveTo(getX(i), getY(v))
      else ctx.lineTo(getX(i), getY(v))
    })
    ctx.stroke()
    ctx.lineTo(canvas.width, canvas.height)
    ctx.lineTo(0, canvas.height)
    const gr = ctx.createLinearGradient(0, 0, 0, canvas.height)
    if (isLightTheme) {
      gr.addColorStop(0, isUp ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)')
    } else {
      gr.addColorStop(0, isUp ? 'rgba(0,255,102,0.2)' : 'rgba(255,51,51,0.2)')
    }
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gr
    ctx.fill()

    if (!isMini && hoverIdx !== null && hoverIdx >= 0 && hoverIdx < dataArr.length) {
      const v = dataArr[hoverIdx]
      const hx = getX(hoverIdx)
      const hy = getY(v)
      ctx.beginPath()
      ctx.setLineDash([5, 5])
      ctx.moveTo(hx, 0)
      ctx.lineTo(hx, canvas.height)
      ctx.strokeStyle = isLightTheme ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)
      ctx.fillStyle = isLightTheme ? '#0f172a' : '#fff'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.stroke()

      const txt = isMasterIndex ? `${v.toFixed(2)} Puan` : `$${v.toFixed(2)}`
      ctx.font = 'bold 13px Consolas'
      const w = ctx.measureText(txt).width + 20
      let bx = hx + 10
      let by = hy - 30
      if (bx + w > canvas.width) bx = hx - w - 10
      if (by < 0) by = hy + 10
      ctx.fillStyle = isLightTheme ? 'rgba(255,255,255,0.95)' : 'rgba(11,16,26,0.9)'
      ctx.strokeStyle = '#4cc9f0'
      ctx.lineWidth = 1
      ctx.fillRect(bx, by, w, 26)
      ctx.strokeRect(bx, by, w, 26)
      ctx.fillStyle = isLightTheme ? '#0f172a' : '#fff'
      ctx.fillText(txt, bx + 10, by + 18)
    }
  }

  return { drawProfessionalChart }
}
