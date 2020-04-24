import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';
import SeatPicker from './SeatPicker';
import MainHand from './MainHand';
import HiddenHand from './HiddenHand';
import TrumpPicker from './TrumpPicker';

const trumpPlacement = ['me', 'left', 'partner', 'right'];
const suit = {
    H: 'Hearts',
    D: 'Diamonds',
    S: 'Spades',
    C: 'Clubs'
}

export default class CardTable extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            playerNames: [],
            mySeat: -1,
            myCards: [],
            myHandInfo: 'mhi',
            myTurnInfo: 'mti',
            phase: 'lobby',
            leftName: '',
            leftSeat: -1,
            leftHandInfo: '',
            leftTurnInfo: '',
            partnerName: '',
            partnerSeat: -1,
            partnerHandInfo: '',
            partnerTurnInfo: '',
            rightName: '',
            rightSeat: -1,
            rightHandInfo: '',
            rightTurnInfo: '',
            trump: '',
            trumpPlace: '',
            trumpNom: '',
            turnSeat: -1,
            dealSeat: -1,
            table: [],
            handLengths: [],
            score: [0, 0],
            trickWinner:'',
            tricks:[]
        };
    };

    componentDidMount () {
        const websoc = this.props.client;
        websoc.onmessage = (event) => this.processResponse(event);
    };

    processResponse = (event) => {
        let msg = JSON.parse(event.data);
        if ('pong' != msg.msg_type) {
            console.log(msg);
        }
        if ('game_state' == msg.msg_type) {
            if (msg.game) {
                switch (msg.game.phase) {
                    case 'lobby':
                        this.processLobby(msg);
                        break;
                    case 'vote':
                        this.processVote(msg);
                        break;
                    case 'dealer_swap':
                        this.processSwap(msg);
                        break;
                    case 'play':
                        this.processPlay(msg);
                        break;
                    case 'pause':
                        this.processPause(msg);
                        break;
                    default:
                        break;
                }
            }
        };
    };

    processLobby = (msg) => {
        if (msg.game.players) {
            const plAr = msg.game.players;
            const mySeat = plAr.findIndex( x => x == this.props.name );
            this.setState({
                playerNames: plAr,
                mySeat: mySeat,
                phase: 'lobby'
            })
        };
    };

    processVote = (msg) => {
        if (this.state.phase == 'lobby') {
            this.gameStartSetup(msg);
        } else if (this.state.phase == 'pause' || 
                  (this.state.phase == 'vote2' && msg.game.pass_count == 0)) {
                // second condition is for all players pass trump twice
            this.trumpStartSetup(msg);
        }
        const {leftSeat, rightSeat, partnerSeat, mySeat} = this.state;
        const phaseString = msg.game.pass_count > 3 ? 'vote2' : 'vote';
        let turnInfo = ['', '', '', ''];
        turnInfo[msg.game.turn] = 'trump?';
        this.setState({
            phase: phaseString,
            myCards: msg.hand,
            turnSeat: msg.game.turn,
            leftTurnInfo: turnInfo[leftSeat],
            rightTurnInfo: turnInfo[rightSeat],
            partnerTurnInfo: turnInfo[partnerSeat],
            myTurnInfo: turnInfo[mySeat]
        });
    };

    processSwap = msg => {
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat} = this.state;
        let turnInfo = ['', '', '', ''];
        turnInfo[dealSeat] = 'Swapping...';
        this.setState({
            phase: 'swap',
            leftTurnInfo: turnInfo[leftSeat],
            rightTurnInfo: turnInfo[rightSeat],
            partnerTurnInfo: turnInfo[partnerSeat],
            myTurnInfo: turnInfo[mySeat]
        });
    }

    trickMsg = (num, action) => {
        let retVal;
        if (num == 0) {
            retVal = action ? 'action' : '';
        } else {
            retVal = num == 1 ? '1 trick' : (num + ' tricks');
            if (action) {
                retVal = retVal + ', action';
            }
        }
        return retVal;
    }

    processPlay = msg => {
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat, phase} = this.state;
        let turnInfo = [];
        if (phase == 'vote' || phase == 'vote2' || phase == 'swap') {
            this.handStartSetup(msg);
        }
        for (let i = 0; i < 4; i++) {
            const tricks = msg.game.tricks[i];
            let tInf = this.trickMsg(tricks, (msg.game.turn == i));
            turnInfo.push(tInf);
        }
        this.setState({
            phase: 'play',
            myCards: msg.hand,
            table: msg.game.table,
            tricks: msg.game.tricks,
            trickWinner: '',
            handLengths: msg.game.hand_lengths,
            leftTurnInfo: turnInfo[leftSeat],
            rightTurnInfo: turnInfo[rightSeat],
            partnerTurnInfo: turnInfo[partnerSeat],
            myTurnInfo: turnInfo[mySeat]
        });

    }

    processPause = msg => {
        // console.log('new t:', msg.game.tricks);
        // console.log('old t:', this.state.tricks);
        // console.log('start processPause, msg.hand=', msg.hand);
        let trickWinIndex = -1;
        let trickWinner = '';
        for (let i = 0; i < 4; i++){
            if (msg.game.tricks[i] != this.state.tricks[i]){
                trickWinIndex = i;
                break;
            }
        }
        if (trickWinIndex > -1) {
            //must be?? sanity check
            trickWinner = this.state.playerNames[trickWinIndex] + ' takes the trick!'
        }
        // console.log('trickWinIndex = ', trickWinIndex);
        this.setState ({
            table: msg.game.table,
            handLengths: msg.game.hand_lengths,
            myCards: msg.hand,
            tricks: msg.game.tricks,
            phase: 'pause',
            trickWinner: trickWinner
        })
    }

    handStartSetup = msg => {
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat} = this.state;
        let handInfo = ['', '', '', ''];
        const caller = msg.game.out_player > -1 ? 'Alone' : 'Caller';
        const callSeat = msg.game.caller;
        if (callSeat == dealSeat) {
            handInfo[dealSeat] = 'Dealer, ' + caller;
        } else {
            handInfo[dealSeat] = 'Dealer';
            handInfo[callSeat] = caller;
        }
        // this.state.score is always [{us}, {them}]
        let score = this.arrangeScore(msg.game.score);
        this.setState({
            trump: msg.game.trump,
            table: msg.game.table,
            score: score,
            handLengths: msg.game.hand_lengths,
            leftHandInfo: handInfo[leftSeat],
            rightHandInfo: handInfo[rightSeat],
            partnerHandInfo: handInfo[partnerSeat],
            myHandInfo: handInfo[mySeat]
        });

    }

    arrangeScore = (msgScore) => {
        // this.state.score is always [{us}, {them}]
        const { mySeat } = this.state;
        let score = [];
        if (mySeat % 2 == 0){
            // we're evens
            score[0] = msgScore[0];
            score[1] = msgScore[1];
        } else {
            score[0] = msgScore[1];
            score[1] = msgScore[0];
        }
        return score;
    }

    trumpStartSetup = (msg) => {
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat} = this.state;
        let handInfo = ['', '', '', ''];
        const newDeal = msg.game.dealer;
        handInfo[newDeal] = 'Dealer';
        let tpIndex = msg.game.dealer - mySeat;
        tpIndex = (tpIndex < 0) ? tpIndex + 4 : tpIndex;
        const trumpPlace = trumpPlacement[tpIndex];
        // this.state.score is always [{us}, {them}]
        let score = this.arrangeScore(msg.game.score);
        this.setState({
            trump: '',
            trumpPlace: trumpPlace,
            dealSeat: newDeal,
            score: score,
            trickWinner: '',
            trumpNom: msg.game.trump_nominee,
            leftHandInfo: handInfo[leftSeat],
            rightHandInfo: handInfo[rightSeat],
            partnerHandInfo: handInfo[partnerSeat],
            myHandInfo: handInfo[mySeat]
        });

    }

    gameStartSetup = (msg) => {
        const { playerNames, mySeat } = this.state;
        let handInfo = [' ', ' ', ' ', ' '];
        let turnInfo = [' ', ' ', ' ', ' '];
        handInfo[msg.game.dealer] = 'Dealer';
        turnInfo[msg.game.turn] = 'trump?';
        const leftSeat = (mySeat + 1) % 4;
        const partnerSeat = (mySeat + 2) % 4;
        const rightSeat = (mySeat + 3) % 4;
        let tpIndex = msg.game.dealer - mySeat;
        tpIndex = (tpIndex < 0) ? tpIndex + 4 : tpIndex;
        const trumpPlace = trumpPlacement[tpIndex];
        console.log('trumpPlace:', trumpPlace);
        this.setState ({
            leftName: playerNames[leftSeat],
            leftSeat: leftSeat,
            leftHandInfo: handInfo[leftSeat],
            leftTurnInfo: turnInfo[leftSeat],
            partnerName: playerNames[partnerSeat],
            partnerSeat: partnerSeat,
            partnerHandInfo: handInfo[partnerSeat],
            partnerTurnInfo: turnInfo[partnerSeat],
            rightName: playerNames[rightSeat],
            rightSeat: rightSeat,
            rightHandInfo: handInfo[rightSeat],
            rightTurnInfo: turnInfo[rightSeat],
            myHandInfo : handInfo[mySeat],
            myTurnInfo : turnInfo[mySeat],
            trumpPlace : trumpPlace,
            trumpNom: msg.game.trump_nominee,
            dealSeat: msg.game.dealer
        });
    };

    sendSit = (index) => {
        const { client } = this.props;
        client.send(JSON.stringify({
            action:'take_seat',
            seat: index
        }));
    };

    sendStand = () => {
        const { client } = this.props;
        client.send(JSON.stringify({
            action:'stand_up'
        }));
    };

    sendStart = (startDealer) => {
        this.props.client.send(JSON.stringify({
            action: 'start_game', start_seat: startDealer
        }));
        console.log('start game, dealer = ', startDealer);
    };

    sendVote = (voteObject) => {
        const voteString = JSON.stringify(voteObject);
        console.log('sendVote:', voteString);
        this.props.client.send(voteString);
    };

    sendCard = (index) => {
        const {phase, myCards} = this.state;
        console.log('card click ', myCards[index]);
        if (phase == 'swap') {
            this.props.client.send(JSON.stringify({
                action:'dealer_swap', card: myCards[index]
            }));
        } else if (phase == 'play') {
            this.props.client.send(JSON.stringify({
                action:'play_card', card: myCards[index]
            }));
        }
    };

    genTrick = () => {
        let retVal = [];
        const { table, mySeat, leftSeat, rightSeat, partnerSeat } = this.state;
        const myCard = table[mySeat];
        const leftCard = table[leftSeat];
        const partnerCard = table[partnerSeat];
        const rightCard = table[rightSeat];
        const mySrc = 'cards/' + myCard + '.svg';
        const leftSrc = 'cards/' + leftCard + '.svg';
        const partnerSrc = 'cards/' + partnerCard + '.svg';
        const rightSrc = 'cards/' + rightCard + '.svg';
        let midClass = 'mid__trick';
        if (myCard && partnerCard) {
            midClass += ' both';
        } else if (myCard) {
            midClass += ' me';
        } else if (partnerCard) {
            midClass += ' partner';
        }
        retVal.push (
            <div className="trick__outer">
                <Grid className="trick__grid">
                    <Row className="trick__row">
                        <Column>
                            <div className="left__trick">
                                {leftCard && (
                                    <div className="trick__div">
                                        <img className="trick__card" src={leftSrc} />
                                    </div>
                                )}
                            </div>
                        </Column>
                        <Column>
                            <div className={midClass}>
                                {partnerCard && (
                                    <div className="trick__div">
                                        <img className="trick__card" src={partnerSrc} />
                                    </div>
                                )}
                                {myCard && (
                                    <div className="trick__div">
                                        <img className="trick__card" src={mySrc} />
                                    </div>
                                )}
                            </div>
                        </Column>
                        <Column>
                            <div className="right__trick">
                                {rightCard && (
                                    <div className="trick__div">
                                        <img className="trick__card" src={rightSrc} />
                                    </div>
                                )}
                            </div>
                        </Column>
                    </Row>
                </Grid>
            </div>
        );
        return retVal;
    }

    render () {
        const { playerNames, mySeat, phase, myCards, myHandInfo, myTurnInfo,
            partnerName, partnerHandInfo, partnerTurnInfo, partnerSeat, leftName, leftTurnInfo, leftHandInfo, leftSeat,
            rightName, rightHandInfo, rightTurnInfo, rightSeat, trumpPlace, trumpNom, turnSeat,
            dealSeat, trump, handLengths, score, trickWinner } = this.state;
        const {name, tableName} = this.props;
        const showSeatPicker = phase == 'lobby';
        const showTrump = (phase == 'vote') || (phase == 'vote2') || (phase == 'swap');
        const showTrumpPicker = showTrump && (turnSeat == mySeat);
        const showSwap = (phase == 'swap') && (dealSeat == mySeat);
        const showInfo = !showSeatPicker && !showTrumpPicker && !showSwap;
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        const tcp = "trump__holder " + trumpPlace;
        const trumpImage = (phase != 'vote2') ? 'cards/' + trumpNom + '.svg' : 'cards/1B.svg';
        const trumpMsg = phase == 'play' ? suit[trump] + ' are trump' : '';
        const trickDisplay = (phase == 'play' || phase == 'pause') ? this.genTrick() : [];
        return (
            <div id="table" className="table__main">
                <Grid>
                    {showSeatPicker && (
                     <Row className="table__header">
                        <Column className="hd__left" sm={3}>
                            <h3>{welcomeMsg}</h3>
                        </Column>
                        <Column className="hd__right" sm={1}>
                            <div className="exit__row">
                                <Button
                                    className="leave__button"
                                    kind="ghost"
                                    onClick={()=>{this.props.chooseTable('')}}
                                    renderIcon={Logout32}>Exit</Button>
                            </div>
                        </Column>
                    </Row>
                    )}
                    <Row className="table__top">
                        <Column className="tt__left" sm={1}>
                        </Column>
                        <Column className="tt__center" sm={2}>
                            {!showSeatPicker && (
                            <div className="partner__stack">
                                <div className="player__name">{partnerName}</div>
                                <div className="partner__info">
                                    <div className="play__hinfo">{partnerHandInfo}</div>
                                    <div className="play__tinfo">{partnerTurnInfo}</div>
                                </div>
                                <HiddenHand
                                    numCards={handLengths[partnerSeat]} />
                            </div>)}
                        </Column>
                        <Column className="tt__right" sm={1}>
                            {!showSeatPicker && (
                            <div className="score__holder">
                                <div className="us__score">Us: {score[0]}</div>
                                <div className="them__score">Them: {score[1]}</div>
                                <div className="trick__win">{trickWinner}</div>
                            </div>)}
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{leftName}</div>
                                <div className="play__hinfo">{leftHandInfo}</div>
                                <div className="play__tinfo">{leftTurnInfo}</div>
                                <HiddenHand
                                    numCards={handLengths[leftSeat]} />
                            </div>)}
                        </Column>
                        <Column className="tm__center" sm={2}>
                            {showSeatPicker && (
                            <SeatPicker
                                names={playerNames}
                                handleSit={this.sendSit}
                                handleStand={this.sendStand}
                                mySeat={mySeat}
                                handleStart={this.sendStart}
                            />)}
                            { showTrump && (
                                <div className="trump__outer">
                                    <div className={tcp}>
                                        <img className="trump__card" src={trumpImage} />
                                    </div>
                                </div>
                            )}
                            { (phase=='play' || phase=='pause') && (
                                <div className="trick__holder">{trickDisplay}</div>
                            )}
                        </Column>
                        <Column className="tm__right" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{rightName}</div>
                                <div className="play__hinfo">{rightHandInfo}</div>
                                <div className="play__tinfo">{rightTurnInfo}</div>
                                <HiddenHand
                                    numCards={handLengths[rightSeat]} />
                            </div>)}
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                            {showInfo && (
                                <div className="my__stack">
                                    <div className="my__hinfo">You: {myHandInfo}</div>
                                    <div className="my__tinfo">{myTurnInfo}</div>
                                    <div className="my__tinfo">{trumpMsg}</div>
                                </div>
                            )}
                            {showTrumpPicker && (
                                <TrumpPicker
                                    trumpCard={trumpNom}
                                    phaseTwo={phase == 'vote2'}
                                    myDeal={dealSeat == mySeat}
                                    handleVote={this.sendVote} />
                            )}
                            {showSwap && (
                                <div className="my__stack">
                                    <div className="my_tinfo">Click a card to discard:</div>
                                </div>
                            )}
                        </Column>
                        <Column className="tb__center" sm={3}>
                            {!showSeatPicker && (
                                <MainHand
                                    cards={myCards}
                                    cardClick={this.sendCard}
                                />
                            )}
                        </Column>
                    </Row>
                </Grid>
                
                
            </div>
        );
    };
}

CardTable.propTypes = {
    chooseTable: PropTypes.func,
    name: PropTypes.string,
    tableName: PropTypes.string,
    active: PropTypes.bool,
    client: PropTypes.object
}