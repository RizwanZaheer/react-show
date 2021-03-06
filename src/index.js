/* eslint-disable no-restricted-syntax, react/forbid-prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import RAF from 'raf'

const transitionEvent = (() => {
  if (typeof document === 'undefined') {
    return
  }
  const testElement = document.createElement('fakeelement')
  const transitions = {
    transition: 'transitionend',
    OTransition: 'oTransitionEnd',
    MozTransition: 'transitionend',
    WebkitTransition: 'webkitTransitionEnd',
  }

  /* eslint-disable no-restricted-syntax */
  for (const t in transitions) {
    if (testElement && testElement.style && testElement.style[t] !== undefined) {
      return transitions[t]
    }
  }
})()

const easings = {
  // Cubic
  easeInCubic: 'cubic-bezier(0.550, 0.055, 0.675, 0.190)',
  easeOutCubic: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',

  // Circ
  easeInCirc: 'cubic-bezier(0.600, 0.040, 0.980, 0.335)',
  easeOutCirc: 'cubic-bezier(0.075, 0.820, 0.165, 1.000)',
  easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.150, 0.860)',

  // Expo
  easeInExpo: 'cubic-bezier(0.950, 0.050, 0.795, 0.035)',
  easeOutExpo: 'cubic-bezier(0.190, 1.000, 0.220, 1.000)',
  easeInOutExpo: 'cubic-bezier(1.000, 0.000, 0.000, 1.000)',

  // Quad
  easeInQuad: 'cubic-bezier(0.550, 0.085, 0.680, 0.530)',
  easeOutQuad: 'cubic-bezier(0.250, 0.460, 0.450, 0.940)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.030, 0.515, 0.955)',

  // Quart
  easeInQuart: 'cubic-bezier(0.895, 0.030, 0.685, 0.220)',
  easeOutQuart: 'cubic-bezier(0.165, 0.840, 0.440, 1.000)',
  easeInOutQuart: 'cubic-bezier(0.770, 0.000, 0.175, 1.000)',

  // Quint
  easeInQuint: 'cubic-bezier(0.755, 0.050, 0.855, 0.060)',
  easeOutQuint: 'cubic-bezier(0.230, 1.000, 0.320, 1.000)',
  easeInOutQuint: 'cubic-bezier(0.860, 0.000, 0.070, 1.000)',

  // Sine
  easeInSine: 'cubic-bezier(0.470, 0.000, 0.745, 0.715)',
  easeOutSine: 'cubic-bezier(0.390, 0.575, 0.565, 1.000)',
  easeInOutSine: 'cubic-bezier(0.445, 0.050, 0.550, 0.950)',

  // Back
  easeInBack: 'cubic-bezier(0.600, -0.280, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175,  0.885, 0.320, 1.275)',
  easeInOutBack: 'cubic-bezier(0.680, -0.550, 0.265, 1.550)',
}

export default class ReactShow extends React.Component {
  static easings = easings
  static propTypes = {
    easing: PropTypes.string,
    duration: PropTypes.number,
    transitionProperty: PropTypes.string,
    unmountOnHide: PropTypes.bool,
    style: PropTypes.object,
    styleHide: PropTypes.object,
    styleShow: PropTypes.object,
    transitionOnMount: PropTypes.bool,
    children: PropTypes.node.isRequired,
  }

  static defaultProps = {
    show: false,
    easing: 'easeOutQuad',
    duration: 300,
    transitionProperty: 'all',
    unmountOnHide: true,
    transitionOnMount: false,
    style: {
      overflow: 'hidden',
    },
    styleHide: {
      height: 0,
    },
    styleShow: {
      height: 'auto',
    },
  }

  constructor (props) {
    super(props)
    this.state = {
      next: false,
      mountContent: props.show,
      currentStyle: props.transitionOnMount || !props.show ? props.styleHide : props.styleShow,
    }
  }
  componentDidMount () {
    if (this.props.transitionOnMount && this.props.show) {
      this.animateIn()
    }
  }
  componentWillReceiveProps (next) {
    if (!this.props.show && next.show) {
      this.animateIn()
    } else if (this.props.show && !next.show) {
      this.animateOut()
    }
  }
  componentDidUpdate () {
    const { styleHide, styleShow } = this.props

    if (this.state.next === 'show') {
      let measurements = {}
      // Only measure if we need to
      if (this.stylePropIsAuto('width') || this.stylePropIsAuto('height')) {
        measurements = this.measure()
      }
      this.setState({
        next: 'auto',
        currentStyle: {
          ...styleShow,
          // animate to computed width and height
          ...(this.stylePropIsAuto('width') ? { width: `${measurements.width}px` } : {}),
          ...(this.stylePropIsAuto('height') ? { height: `${measurements.height}px` } : {}),
        },
      })
    }

    if (this.state.next === 'hide') {
      this.setState({
        next: false,
      })
      const queueFinalHide = () => {
        // If we still need to measure, delay a bit until element is ready.
        // double RAF this to be sure that the browser has painted
        RAF(() =>
          RAF(() => {
            if (this.checkNeedToMeasure()) {
              if (this.checkIsAuto()) {
                queueFinalHide()
                return
              }
            }

            if (!this.state.next) {
              this.setState({
                currentStyle: styleHide,
              })
            }
          }),
        )
      }
      queueFinalHide()
    }
  }
  onTransitionEnd = () => {
    const { unmountOnHide, show } = this.props
    if (!show && unmountOnHide && this.state.next === 'stable') {
      this.setState({
        next: false,
        mountContent: false,
      })
    }
    if (
      show &&
      this.state.next === 'auto' &&
      (this.stylePropIsAuto('width') || this.stylePropIsAuto('height'))
    ) {
      const currentStyle = { ...this.state.currentStyle }
      if (this.stylePropIsAuto('width')) {
        currentStyle.width = 'auto'
      }
      if (this.stylePropIsAuto('height')) {
        currentStyle.height = 'auto'
      }
      this.setState({
        next: false,
        currentStyle,
      })
    }
  }
  animateIn = () => {
    this.setState({
      next: 'show',
      mountContent: true,
    })
  }
  animateOut = () => {
    // If we need to animate 'auto' values, measure first
    const measurements = this.checkNeedToMeasure() ? this.measure() : {}
    this.setState({
      next: 'hide',
      currentStyle: {
        ...this.state.currentStyle,
        ...(this.stylePropIsAuto('width') ? { width: `${measurements.width}px` } : {}),
        ...(this.stylePropIsAuto('height') ? { height: `${measurements.height}px` } : {}),
      },
    })
  }
  handleRef = el => {
    this.el = el
    if (this.el && !this.isListening) {
      this.el.addEventListener(transitionEvent, this.onTransitionEnd)
    }
  }
  checkNeedToMeasure = () => this.stylePropIsAuto('height') || this.stylePropIsAuto('width')
  checkIsAuto = () =>
    (this.stylePropIsAuto('height') && this.el && this.el.style.height === 'auto') ||
    (this.stylePropIsAuto('width') && this.el && this.el.style.width === 'auto')
  stylePropIsAuto = prop => this.props.styleShow[prop] === 'auto'
  measure = () => {
    if (!this.el) {
      return {}
    }
    return {
      width: this.el.scrollWidth,
      height: this.el.scrollHeight,
    }
  }
  makeStyles = () => {
    const { style, transitionProperty, duration, easing } = this.props
    const { currentStyle } = this.state

    const resolvedEasing = easings[easing] || easing || 'ease-out'

    return {
      transitionProperty,
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: `${resolvedEasing}`,
      ...style,
      ...currentStyle,
    }
  }
  render () {
    const {
      children,
      show: originalShow,
      easing,
      duration,
      transitionProperty,
      unmountOnHide,
      transitionOnMount,
      show,
      style,
      styleHide,
      styleShow,
      ...rest
    } = this.props
    const { mountContent } = this.state
    return mountContent ? (
      <div ref={this.handleRef} style={this.makeStyles()} {...rest}>
        {children}
      </div>
    ) : null
  }
}
