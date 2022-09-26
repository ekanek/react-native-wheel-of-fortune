import React, {Component} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import * as d3Shape from 'd3-shape';
import LinearGradient from 'react-native-linear-gradient';

import Svg, {G, Text, TSpan, Path, Pattern} from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const {width, height} = Dimensions.get('screen');

class WheelOfFortune extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(width - 60),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    };
    this.angle = 0;

    this.prepareWheel();
  }

  prepareWheel = () => {
    this.Rewards = this.props.options.rewards;
    this.RewardCount = this.Rewards.length;

    this.numberOfSegments = this.RewardCount;
    this.fontSize = this.props.options.textFontSize || 20;
    this.oneTurn = 360;
    this.angleBySegment = this.oneTurn / this.numberOfSegments;
    this.angleOffset = this.angleBySegment / 2;
    this.winner = this.props.options.winner;

    this._wheelPaths = this.makeWheel();
    this._angle = new Animated.Value(0);

    this.props.options.onRef(this);
  };

  resetWheelState = () => {
    this.setState({
      enabled: false,
      started: false,
      finished: false,
      winner: null,
      gameScreen: new Animated.Value(width - 60),
      wheelOpacity: new Animated.Value(1),
      imageLeft: new Animated.Value(width / 2 - 30),
      imageTop: new Animated.Value(height / 2 - 70),
    });
  };

  _tryAgain = () => {
    const { started, finished } = this.state;
    if (!started || finished) {
      this.prepareWheel();
      this.resetWheelState();
      this.angleListener();
      this._onPress();
    }
  };

  angleListener = () => {
    this._angle.addListener(event => {
      if (this.state.enabled) {
        this.setState({
          enabled: false,
          finished: false,
        });
      }

      this.angle = event.value;
    });
  };

  componentWillUnmount() {
    this.props.options.onRef(undefined);
  }

  componentDidMount() {
    this.angleListener();
  }

  makeWheel = () => {
    const data = Array.from({length: this.numberOfSegments}).fill(1);
    
    const colors = this.props.options.colors;
    const textColors = this.props.options.textColors;
    const arcs = d3Shape.pie()(data);
    return arcs.map((arc, index) => {
      const instance = d3Shape
        .arc()
        .padAngle(0)
        .outerRadius((width + 2) / 2)
        .innerRadius(this.props.options.innerRadius || 100);
      return {
        path: instance(arc),
        color: colors[arc.index],
        textColor: textColors[arc.index],
        value: this.Rewards[arc.index],
        centroid: instance.centroid(arc),
        index: arc.index,
      };
    });
  };

  _getWinnerIndex = () => {
    const deg = Math.abs(Math.round(this.angle % this.oneTurn));
    // wheel turning counterclockwise
    if (this.angle < 0) {
      return Math.floor(deg / this.angleBySegment);
    }
    // wheel turning clockwise
    return (
      (this.numberOfSegments - Math.floor(deg / this.angleBySegment)) %
      this.numberOfSegments
    );
  };

  _onPress = () => {
    const duration = this.props.options.duration || 10000;

    this.setState({
      started: true,
    });
    const winnerIndex = this._wheelPaths.findIndex(item => {
      return item.index === this.winner;
    });
    Animated.timing(this._angle, {
      toValue:
        365 -
        this.winner * (this.oneTurn / this.numberOfSegments) +
        360 * (duration / 1000),
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      this.setState({
        finished: true,
        winner: this._wheelPaths[winnerIndex].value,
      });
      this.props.getWinner(this._wheelPaths[winnerIndex].value, winnerIndex);
    });
  };

  textContainsNumber = (item) => /\d/.test(item);


  getLinesToBeRendered = (text) => {
    const words = text.split(" ");
    let lines = [];
    let lineToBeAdded = '';
    words.forEach((item, index) => {
      if (this.textContainsNumber(item)) {
        lines.push(lineToBeAdded);
        lineToBeAdded = item;
        return;
      }

      const conditionForLengthGreaterThanPrevious = lineToBeAdded.length > lines[lines.length - 1]?.length;

      if (lineToBeAdded !== '') {
        if (lines.length !== 0 && (conditionForLengthGreaterThanPrevious || this.textContainsNumber(lineToBeAdded))) {
          lines.push(lineToBeAdded);
          lineToBeAdded = item;
        } else {
          lineToBeAdded = lineToBeAdded + ` ${item}`;
        }
      } else {
        lineToBeAdded = item;
      }
    });
    if (lineToBeAdded !== '') {
      lines.push(lineToBeAdded);
    }
    return lines;
  }

  _textRender = (x, y, number, i, color) => {
      
    const lines = this.getLinesToBeRendered(number);
    return lines.map((item, index) => {
      const isBold = this.textContainsNumber(item);
      const addMarginTop =  this.textContainsNumber(lines[index - 1]) || isBold ? this.fontSize : 4;
      const fontSize = isBold ? this.fontSize * 2 :  this.fontSize;
      const fontFamily = isBold ? 'Roboto-Bold' : 'Roboto-Medium';
      const textColor = isBold ? 'white' : color;
      return (
        <Text
        x={x}
        y={y + index * (this.fontSize + 5) + addMarginTop}
        fill={
          textColor
        }
        inlineSize={20}
        adjustsFontSizeToFit={true}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontSize={fontSize}>
        {item}
        </Text>
      );
    })
}

  _renderSvgWheel = () => {
    return (
      <View style={styles.container}>
        {this._renderKnob()}

        <Animated.View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              {
                rotate: this._angle.interpolate({
                  inputRange: [-this.oneTurn, 0, this.oneTurn],
                  outputRange: [
                    `-${this.oneTurn}deg`,
                    `0deg`,
                    `${this.oneTurn}deg`,
                  ],
                }),
              },
            ],
            backgroundColor: this.props.options.backgroundColor
              ? this.props.options.backgroundColor
              : '#fff',
            width: width - 43,
            height: width - 43,
            borderRadius: (width - 43) / 2,
            borderWidth: 0,
            borderColor: this.props.options.borderColor
              ? this.props.options.borderColor
              : '#fff',
            opacity: this.state.wheelOpacity,
            elevation: 30,
          }}>
          <LinearGradient
          colors={['rgba(94, 138, 168, 0.54)', 'rgba(23, 49, 67, 0.54)', 'rgba(18, 30, 38, 1)' ]}
          style={styles.border}
          >
          <AnimatedSvg
            width={this.state.gameScreen}
            height={this.state.gameScreen}
            viewBox={`0 0 ${width} ${width}`}
            style={{
              transform: [{rotate: `-${this.angleOffset}deg`}],
            }}>
            <G y={width / 2} x={width / 2}>
              {this._wheelPaths.map((arc, i) => {
                const [x, y] = arc.centroid;
                const number = arc.value.toString();

                return (
                  <G key={`arc-${arc.index}`}>
                    <Path d={arc.path} strokeWidth={2} fill={arc.color} />
                    <G
                      rotation={
                        (arc.index * this.oneTurn) / this.numberOfSegments +
                        this.angleOffset + 90
                      }
                      origin={`${x}, ${y}`}>
                      {this._textRender(x - 10, y - 20, number, arc.index, arc.textColor)}
                    </G>
                  </G>
                );
              })}
            </G>
          </AnimatedSvg>
        </LinearGradient>
          
        </Animated.View>
        
        
      </View>
    );
  };

  _renderKnob = () => {
    const knobSize = this.props.options.knobSize
      ? this.props.options.knobSize
      : 20;
    // [0, this.numberOfSegments]
    const YOLO = Animated.modulo(
      Animated.divide(
        Animated.modulo(
          Animated.subtract(this._angle, this.angleOffset),
          this.oneTurn,
        ),
        new Animated.Value(this.angleBySegment),
      ),
      1,
    );

    const knobImageStyle = { width: knobSize, height: knobSize};

    return (
      <Animated.View
        style={{
          width: knobSize,
          justifyContent: 'flex-end',
          elevation: 50,
          zIndex: 50,
          opacity: this.state.wheelOpacity,
          transform: [
            {
              rotate: YOLO.interpolate({
                inputRange: [-1, -0.5, -0.0001, 0.0001, 0.5, 1],
                outputRange: [
                  '0deg',
                  '0deg',
                  '35deg',
                  '-35deg',
                  '0deg',
                  '0deg',
                ],
              }),
            },
          ],
        }}>
        <Svg
          width={knobSize}
          viewBox={`0 0 57 100`}
          style={{
            transform: [{translateY: 20}],
          }}>
          <Image
            source={this.props.options.knobSource}
            style={knobImageStyle}
          />
        </Svg>
      </Animated.View>
    );
  };

  _renderTopToPlay() {
    if (this.state.started == false) {
      return (
        <TouchableOpacity onPress={() => this._onPress()}>
          {this.props.options.playButton()}
        </TouchableOpacity>
      );
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View
          style={styles.wheelContainer}>
          <Animated.View style={[styles.content,]}>
            {this._renderSvgWheel()}
          </Animated.View>
        </View>
        {this.props.options.playButton ? this._renderTopToPlay() : null}
      </View>
    );
  }
}

export default WheelOfFortune;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {},
  startText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  wheelContainer: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -30,
    transform: [{rotate: '-90deg'}]
  },
  border: {
    width: width - 43,
    height: width - 43,
    borderRadius: (width - 43) / 2, 
    justifyContent: 'center',
    alignItems: 'center',
  }
});
