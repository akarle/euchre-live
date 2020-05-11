import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column, OverflowMenu, OverflowMenuItem} from 'carbon-components-react';
import {Logout32, Redo32, Package32} from '@carbon/icons-react';
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

const hard_order = true;
const hard_pick = true;

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
            tricks:[],
            bannerMsg: '',
            innerWinMsg: '',
            onlyAlone: false,
            noPick: false,
            amSpectator: false
        };
    };

    componentDidMount () {
        const {name, tableName, client, firstMsg} = this.props;
        client.onmessage = (event) => this.processResponse(event);
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        if (firstMsg) {
            this.processPlayerChange(firstMsg);
        }
        this.setState({
            bannerMsg: welcomeMsg
        });
    };

    componentDidUpdate (prevProps) {
        const {firstMsg} = this.props;
        if (firstMsg && !prevProps.firstMsg) {
            this.processPlayerChange(firstMsg);
        }
    }

    processResponse = (event) => {
        const { playerNames} = this.state;
        let msg = JSON.parse(event.data);
        if ('pong' != msg.msg_type) {
            console.log(msg);
        }
        if ('game_state' == msg.msg_type) {
            if (msg.game.phase != 'lobby') {
                if (!_.isEqual(playerNames, msg.game.players)){
                    this.processPlayerChange(msg);
                } else {
                    this.processResponseSwitch(msg);
                }
            } else {
                this.processLobby(msg);
            }
        };
    };

    processResponseSwitch = msg => {
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
            case 'end':
                this.processEnd(msg);
                break;
            default:
                break;
        }
    }

    processPlayerChange = msg => {
        const {amSpectator} = this.state;
        console.log('Player update!!');
        const newSpectator = msg.is_spectator > 0;
        if (!amSpectator && !newSpectator) {
            // I'm already a player, update the name set and continue
            this.setState({
                playerNames: msg.game.players
            }, () => { 
                this.processResponseSwitch(msg);
            });
        } else if (!amSpectator && newSpectator) {
            // I was playing and just stood up - reset me to spectator mode
            this.processFirstMessage(msg);
        } else if (amSpectator && !newSpectator) {
            // I was spectator and just took a seat
            this.processFirstMessage(msg);
        } else {
            // was and still am spectator - update names and continue
            this.setState({
                playerNames: msg.game.players,
            }, () => { 
                this.processResponseSwitch(msg);
            });
        }

    }

    processFirstMessage = msg => {
        console.log('processFirstMessage, msg:\n', msg);
        // in cases of forceRejoin, the firstMsg could be lobby, vote, play
        // for cases of ordinary game join, will be lobby
        if (msg && msg.game) {
            switch (msg.game.phase) {
                case 'lobby':
                    this.processLobby(msg);
                    break;
                case 'vote':
                    this.processFirstMsgVote(msg);
                    break;
                case 'play':
                    this.processFirstMsgPlay(msg);
                    break;
                case 'end':
                    this.processFirstMsgEnd(msg);
                    break;
            }
        }
        //TODO force correct score (for all the rejoin cases)
    }

    // NOTE the processFirstMsgXyz functions are needed to handle the case
    //  of a user dropping connection and doing a force-rejoin back to the
    //  same table.
    // In normal game play, firstMsg will be a 'lobby', and none of the other
    //  processFirst* variants will be called

    processFirstMsgEnd = msg => {
        // timer use in these processFirst* is to allow sequence of setState to complete
        this.initMySeat(msg);
        setTimeout(this.gameStartSetup, 300, msg);
        setTimeout(this.handStartSetup, 600, msg);
        setTimeout(this.processEnd, 900, msg);
    }

    processFirstMsgPlay = msg => {
        this.initMySeat(msg);
        setTimeout(this.gameStartSetup, 300, msg);
        setTimeout(this.handStartSetup, 600, msg);
        setTimeout(this.processPlay, 900, msg);
        // this.gameStartSetup(msg);
        // this.handStartSetup(msg);
        // this.processPlay(msg);
    }

    processFirstMsgVote = msg => {
        this.initMySeat(msg);
        setTimeout(this.gameStartSetup, 300, msg);
        setTimeout(this.processVote, 600, msg);
        // this.gameStartSetup(msg);
        // this.processVote(msg);
    }

    // OK to let processLobby run twice on first lobby msg, which
    //  may happen if CardTable already mounted on join_table
    processLobby = (msg) => {
        this.initMySeat(msg);
        this.setState({
            phase: 'lobby',
            score: [0,0]
        });
    };

    initMySeat = msg => {
        const {name} = this.props;
        const newSpec = msg.is_spectator >  0;
        if (msg.game.players) {
            const plAr = msg.game.players;
            let mySeat = plAr.findIndex( x => x == name );
            console.log('initMySeat.mySeat=', mySeat);
            if (newSpec && msg.game.phase != 'lobby'){
                mySeat = 3;
            };
            this.setState({
                playerNames: plAr,
                mySeat: mySeat,
                amSpectator: newSpec
            });
        };
    }

    haveSuit = (hand, trumpNom) => {
        const targetSuit = trumpNom.substring(1);
        for (let i=0; i < hand.length; i++) {
            if (hand[i].substring(1) == targetSuit) {
                console.log('targetSuit:' + targetSuit + ' matched by ' + hand[i]);
                return true;
            }
        }
        return false;
    }

    processVote = (msg) => {
        if (this.state.phase == 'lobby') {
            this.gameStartSetup(msg);
        } else if (this.state.phase == 'pause' || 
                  (this.state.phase == 'vote2' && msg.game.pass_count == 0)) {
                // second condition is for all players pass trump twice
            this.trumpStartSetup(msg);
        }
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat} = this.state;
        const vote1phase = msg.game.pass_count < 4;
        const phaseString = vote1phase ? 'vote' : 'vote2';
        const onlyAlone = hard_order && vote1phase && dealSeat == partnerSeat;
        const noPick = hard_pick && vote1phase && (dealSeat == mySeat) && !this.haveSuit(msg.hand, msg.game.trump_nominee);
        let turnInfo = ['', '', '', ''];
        turnInfo[msg.game.turn] = 'trump?';
        this.setState({
            phase: phaseString,
            myCards: msg.hand,
            turnSeat: msg.game.turn,
            onlyAlone: onlyAlone,
            noPick: noPick,
            handLengths: msg.game.hand_lengths,
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
        this.setState ({
            table: msg.game.table,
            handLengths: msg.game.hand_lengths,
            myCards: msg.hand,
            tricks: msg.game.tricks,
            phase: 'pause',
            trickWinner: trickWinner
        })
    }

    processEnd = msg => {
        const {playerNames, leftSeat, partnerSeat, rightSeat, amSpectator} = this.state;
        // arrangeScore[0] us, [1] them
        const finalScore = this.arrangeScore(msg.game.score);
        const myName =  amSpectator ? playerNames[3] : 'You';
        const winMsg = finalScore[0] > finalScore[1] ?
            myName + ' and ' + playerNames[partnerSeat] + ' win the game!!' :
            playerNames[leftSeat] + ' and ' + playerNames[rightSeat] + ' win this one...';
        const innerWin = amSpectator ? 'Game Over...' :
          finalScore[0] > finalScore[1] ? 'You Win!!' : 'You lost...';
        this.setState({
            phase: 'end',
            score: finalScore,
            bannerMsg: winMsg,
            innerWinMsg: innerWin
        });
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
        // console.log('start game, dealer = ', startDealer);
    };

    sendExit = () => {
        this.props.exitTable();
    };

    sendVote = (voteObject) => {
        const voteString = JSON.stringify(voteObject);
        // console.log('sendVote:', voteString);
        this.props.client.send(voteString);
    };

    sendCard = (index) => {
        const {phase, myCards} = this.state;
        // console.log('card click ', myCards[index]);
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

    sendRestart = () => {
        this.props.client.send(JSON.stringify({
            action:'restart_game'
        })); 
    }

    genGameOver = () => {
        const {innerWinMsg, amSpectator} = this.state;
        let retVal = [];
        const instMsg = amSpectator ? 'You can take a seat if one becomes empty, or you can return to the lobby...'
        : 'You can play again at this table, or return to the lobby to change your table or player name...';
        retVal.push(
        <div className="gover__outer">
            <div className="gover__inwin">{innerWinMsg}</div>
            <div className="gover__inst">
               {instMsg} 
            </div>
            <div className="gover__buttons">
                <Button
                    className="exit2__button"
                    kind="secondary"
                    onClick={this.sendExit}
                    renderIcon={Logout32}
                    >Exit to Lobby</Button> 
                {!amSpectator && ( 
                    <Button
                    className="repeat__button"
                    kind="primary"
                    onClick={()=>this.sendRestart()}
                    renderIcon={Redo32}
                    >Play Again!!</Button> 

                )}
            </div>
        </div>
        );
        return retVal;
    }

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

    genNameDisplay = seatNum => {
        let retVal = '';
        const { playerNames, mySeat, myHandInfo, amSpectator } = this.state;
        let seatName = playerNames[seatNum];
        if (seatNum == mySeat) {
            seatName = amSpectator ? seatName : 'You';
            if (seatName != 'Empty'){
                seatName += ': ' + myHandInfo;
            }
        }
        if (seatName != 'Empty') {
            retVal = (<div>{seatName}</div>);
        } else {
            retVal = (
            <div>Empty
                {amSpectator && (
                    <Button
                    className="sit__button"
                    kind="ghost"
                    onClick={()=>{this.sendSit(seatNum)}}
                    renderIcon={Package32}>Choose seat</Button>
                )}
            </div>);
        }
        return retVal;
    }

    render () {
        const { playerNames, mySeat, phase, myCards, myTurnInfo, amSpectator,
            partnerHandInfo, partnerTurnInfo, partnerSeat, leftTurnInfo, leftHandInfo, leftSeat,
            rightHandInfo, rightTurnInfo, rightSeat, trumpPlace, trumpNom, turnSeat,
            dealSeat, trump, handLengths, score, trickWinner, bannerMsg, noPick, onlyAlone } = this.state;
        const showSeatPicker = phase == 'lobby';
        const showGameOver = phase == 'end';
        const showTrump = (phase == 'vote') || (phase == 'vote2') || (phase == 'swap');
        const showTrumpPicker = showTrump && (turnSeat == mySeat);
        const showSwap = (phase == 'swap') && (dealSeat == mySeat);
        const showBottomInfo = !showSeatPicker && (amSpectator || (!showTrumpPicker && !showSwap));
        const tcp = "trump__holder " + trumpPlace;
        const trumpImage = (phase != 'vote2') ? 'cards/' + trumpNom + '.svg' : 'cards/1B.svg';
        const trumpMsg = phase == 'play' ? suit[trump] + ' are trump' : '';
        const trickDisplay = (phase == 'play' || phase == 'pause') ? this.genTrick() : [];
        const gameOverDisplay = (phase == 'end') ? this.genGameOver() : [];
        const usLabel = amSpectator ? playerNames[1] + ' & ' + playerNames[3] + ': ' : 'Us: ';
        const themLabel = amSpectator ? playerNames[0] + ' & ' + playerNames[2] + ': ' : 'Them: ';
        return (
            <div id="table" className="table__main">
                <Grid>
                    {(showSeatPicker || showGameOver) && (
                     <Row className="table__header">
                        <Column className="hd__left" sm={3}>
                            <h3>{bannerMsg}</h3>
                        </Column>
                        <Column className="hd__right" sm={1}>
                            <div className="exit__row">
                                <Button
                                    className="leave__button"
                                    kind="ghost"
                                    onClick={this.sendExit}
                                    renderIcon={Logout32}>Exit</Button>
                            </div>
                        </Column>
                    </Row>
                    )}
                    <Row className="table__top">
                        <Column className="tt__left" sm={1}>
                            {!showSeatPicker && (
                                    <div className="menu__holder">
                                        <OverflowMenu>
                                            <OverflowMenuItem
                                                itemText="Stand"
                                                disabled={amSpectator}
                                                onClick={this.sendStand}
                                            />
                                            <OverflowMenuItem
                                                itemText="Exit to Lobby"
                                                onClick={this.sendExit}
                                            />
                                        </OverflowMenu>
                                    </div>
                                )}
                        </Column>
                        <Column className="tt__center" sm={2}>
                            {!showSeatPicker && (
                            <div className="partner__stack">
                                <div className="player__name">{this.genNameDisplay(partnerSeat)}</div>
                                <div className="partner__info">
                                    <div className="play__hinfo">{partnerHandInfo}</div>
                                    <div className="play__tinfo">{partnerTurnInfo}</div>
                                </div>
                                <HiddenHand
                                    numCards={handLengths[partnerSeat]} />
                            </div>)}
                        </Column>
                        <Column className="tt__right" sm={1}>
                            {(phase != 'lobby') && (
                            <div className="score__holder">
                                <div className="us__score">{usLabel}{score[0]}</div>
                                <div className="them__score">{themLabel}{score[1]}</div>
                                <div className="trick__win">{trickWinner}</div>
                            </div>)}
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{this.genNameDisplay(leftSeat)}</div>
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
                                amSpectator={amSpectator}
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
                            { showGameOver && (
                                <div className="gameOver__holder">
                                    {gameOverDisplay}
                                </div>
                            )}
                        </Column>
                        <Column className="tm__right" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{this.genNameDisplay(rightSeat)}</div>
                                <div className="play__hinfo">{rightHandInfo}</div>
                                <div className="play__tinfo">{rightTurnInfo}</div>
                                <HiddenHand
                                    numCards={handLengths[rightSeat]} />
                            </div>)}
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                            {showBottomInfo && (
                                <div className="my__stack">
                                    <div className="my__hinfo">{this.genNameDisplay(mySeat)}</div>
                                    <div className="my__tinfo">{myTurnInfo}</div>
                                    <div className="my__tinfo">{trumpMsg}</div>
                                </div>
                            )}
                            {showTrumpPicker && !amSpectator && (
                                <TrumpPicker
                                    trumpCard={trumpNom}
                                    phaseTwo={phase == 'vote2'}
                                    myDeal={dealSeat == mySeat}
                                    onlyAlone={onlyAlone}
                                    noPick={noPick}
                                    handleVote={this.sendVote} />
                            )}
                            {showSwap && !amSpectator && (
                                <div className="my__stack">
                                    <div className="my_tinfo">Click a card to discard:</div>
                                </div>
                            )}
                        </Column>
                        <Column className="tb__center" sm={3}>
                            {!showSeatPicker && !amSpectator && (
                                <MainHand
                                    cards={myCards}
                                    cardClick={this.sendCard}
                                />
                            )}
                            {!showSeatPicker && amSpectator && (
                                <HiddenHand
                                numCards={handLengths[mySeat]} />
                            )}
                        </Column>
                    </Row>
                </Grid>
                
                
            </div>
        );
    };
}

CardTable.propTypes = {
    exitTable: PropTypes.func,
    name: PropTypes.string,
    tableName: PropTypes.string,
    firstMsg: PropTypes.object,
    client: PropTypes.object
}