import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column, OverflowMenu, OverflowMenuItem, Tooltip} from 'carbon-components-react';
import {Logout32, Redo32, Package32, View16, ViewOff16, Information16} from '@carbon/icons-react';
import SeatPicker from './SeatPicker';
import MainHand from './MainHand';
import HiddenHand from './HiddenHand';
import TrumpPicker from './TrumpPicker';
import ChatPanel from './ChatPanel';

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
            tricks:[],
            spectators: [],
            bannerMsg: '',
            innerWinMsg: '',
            onlyAlone: false,
            noPick: false,
            noPass: false,
            amSpectator: false,
            latestPost: '',
            showErrors: true,
            hard_order: true,
            hard_pick: true,
            stick_dealer: false
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
            this.setState({
                spectators: msg.game.spectators
            });
            if (msg.game.phase != 'lobby') {
                if (!_.isEqual(playerNames, msg.game.players)){
                    this.processPlayerChange(msg);
                } else {
                    this.processResponseSwitch(msg);
                }
            } else {
                this.processLobby(msg);
            }
        } else if ('chat' == msg.msg_type) {
            this.processChat(msg);
        } else if ('error' == msg.msg_type) {
            this.processError(msg);
        }
    };

    processError = msg => {
        if (msg.msg) {
            const post = '<<Error: ' + msg.msg;
            this.setState({
                latestPost: post
            });
        }
    };

    processChat = msg => {
        let post = msg.msg;
        if (post && post != '') {
            this.setState({
                latestPost: post
            });
        }
    }

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
            this.setState({
                spectators: msg.game.spectators
            });
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
                amSpectator: newSpec,
                hard_order: msg.settings.hard_order,
                hard_pick: msg.settings.hard_pick,
                stick_dealer: msg.settings.stick_dealer
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
        const {leftSeat, rightSeat, partnerSeat, mySeat, dealSeat, hard_order, hard_pick, stick_dealer} = this.state;
        const vote1phase = msg.game.pass_count < 4;
        const phaseString = vote1phase ? 'vote' : 'vote2';
        const onlyAlone = hard_order && vote1phase && dealSeat == partnerSeat;
        const noPass = stick_dealer && !vote1phase && (dealSeat == mySeat);
        const noPick = hard_pick && vote1phase && (dealSeat == mySeat) && !this.haveSuit(msg.hand, msg.game.trump_nominee);
        let turnInfo = ['', '', '', ''];
        turnInfo[msg.game.turn] = 'trump?';
        this.setState({
            phase: phaseString,
            myCards: msg.hand,
            turnSeat: msg.game.turn,
            onlyAlone: onlyAlone,
            noPick: noPick,
            noPass: noPass,
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

    sendChat = post => {
        console.log(post);
        if (post && post != ''){
            this.props.client.send(JSON.stringify({
                action: 'chat',
                msg: post
            }));
        }
        // XX TODO remove this debug action when chat stable
        if ('chat10' == post){
            for (let i=0; i < 10; i++){
                const msg='this is chat10 test-chat-' + i;
                this.props.client.send(JSON.stringify({
                    action: 'chat',
                    msg: msg
                }));
            }
        }
    }

    toggleErrorDisplay = () => {
        // NOTE this trick requires that .err__post is the first selector of all,
        //  so requires it first in our .scss, even before imports
        const { showErrors } = this.state;
        let stylesheet = document.styleSheets[0];
        const nextShowErrors = !showErrors;
        const rule = nextShowErrors ? 'inherit' : 'none';
        stylesheet.cssRules[0].style.display = rule;
        this.setState({
            showErrors: nextShowErrors
        })
        console.log('toggleErrorDisplay');
    }

    genGameOver = () => {
        const {innerWinMsg, amSpectator} = this.state;
        let retVal = [];
        const instMsg = amSpectator ? 'You can take a seat if one becomes empty, or you can return to the lobby...'
        : 'You can play again at this table, or return to the lobby to change your table or player name...';
        retVal.push(
        <div className="gover__outer" key="gom1">
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
            <div className="trick__outer" key="gt1">
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

    genSpecMsgObj = () => {
        const {spectators} = this.state;
        let retVal = {}
        if (!spectators || spectators.length == 0) {
            retVal.title = 'No Spectators';
            retVal.list = null;
        } else {
            retVal.title = (spectators.length == 1) ? '1 Spectator:' : spectators.length + ' Spectators:'; 
            retVal.list = spectators[0];
            for (let i=1; i < spectators.length; i++) {
                retVal.list += ', ' + spectators[i];
            };
        }
        return retVal;
    }

    render () {
        const { playerNames, mySeat, phase, myCards, myTurnInfo, amSpectator,
            partnerHandInfo, partnerTurnInfo, partnerSeat, leftTurnInfo, leftHandInfo, leftSeat,
            rightHandInfo, rightTurnInfo, rightSeat, trumpPlace, trumpNom, turnSeat, spectators,
            dealSeat, trump, handLengths, score, trickWinner, bannerMsg, noPick, noPass, onlyAlone,
            hard_pick, hard_order, stick_dealer, latestPost, showErrors } = this.state;
        const {tableName} = this.props;
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
        const hasSpec = spectators.length > 0;
        const specMsgObj = this.genSpecMsgObj();
        const toggleErrorMsg = showErrors ? 'Hide errors in chat' : 'Show errors in chat';
        return (
            <div id="table" className="table__main">
                <Grid className="og">
                    <Row className="og__row">
                        <Column className="og__left" md={5}>
                        <Grid className="inner__left">
                    {(showSeatPicker || showGameOver) && (
                     <Row className="table__header">
                         <h3 className="banner">{bannerMsg}</h3>
                    </Row>
                    )}
                    <Row className="table__top">
                        <Column className="tt__left" md={3}>
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
                                            <OverflowMenuItem
                                                itemText={toggleErrorMsg}
                                                onClick={this.toggleErrorDisplay}
                                            />
                                        </OverflowMenu>
                                    </div>
                                )}
                        </Column>
                        <Column className="tt__center" md={5}>
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
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" md={3}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{this.genNameDisplay(leftSeat)}</div>
                                <div className="play__hinfo">{leftHandInfo}</div>
                                <div className="play__tinfo">{leftTurnInfo}</div>
                                <HiddenHand
                                    numCards={handLengths[leftSeat]} />
                            </div>)}
                        </Column>
                        <Column className="tm__center" md={5}>
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
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" md={3}>
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
                                    noPass={noPass}
                                    handleVote={this.sendVote} />
                            )}
                            {showSwap && !amSpectator && (
                                <div className="my__stack">
                                    <div className="my_tinfo">Click a card to discard:</div>
                                </div>
                            )}
                        </Column>
                        <Column className="tb__center" md={5}>
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
                </Column>
                <Column className="og__right" md={3}>
                <Grid className="inner_right">
                <Row className="tt__right" >
                    {phase == 'lobby' && (
                        <div className="exit__row">
                            <Button
                                className="leave__button"
                                kind="ghost"
                                onClick={this.sendExit}
                                renderIcon={Logout32}>Exit</Button>
                        </div>
                    )}
                    {(phase != 'lobby') && (
                    <div className="score__holder">
                        <div className="us__score">{usLabel}{score[0]}</div>
                        <div className="them__score">{themLabel}{score[1]}</div>
                        <div className="trick__win">{trickWinner}</div>
                        <div className="info__buttons">
                            <Tooltip
                                direction="left"
                                renderIcon={Information16}
                            >
                                <div className="table__info">
                                    <div className="ti__name">{tableName}</div>
                                    <div className="ti__opt">HardOrder: {hard_order ? 'on' : 'off'}</div>
                                    <div className="ti__opt">HardPick: {hard_pick ? 'on' : 'off'}</div>
                                    <div className="ti__opt">StickDealer: {stick_dealer ? 'on' : 'off'}</div>
                                </div>
                            </Tooltip>
                            <Tooltip
                                direction="left"
                                renderIcon={hasSpec? View16 : ViewOff16}
                            >
                                <div className="spec__info">
                                    <div className="spec__title">
                                        {specMsgObj.title}
                                    </div>
                                    {(specMsgObj.list != null) && (
                                        <div className="spec__list">
                                            {specMsgObj.list}
                                        </div>
                                    )}
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                    )}
                </Row>
                <Row className="tm__right">
                    {!showSeatPicker && (
                    <div className="vert__stack right__stack">
                        <div className="player__name">{this.genNameDisplay(rightSeat)}</div>
                        <div className="play__hinfo">{rightHandInfo}</div>
                        <div className="play__tinfo">{rightTurnInfo}</div>
                        <HiddenHand
                            numCards={handLengths[rightSeat]} />
                    </div>)}
                </Row>
                <Row className="tb__right">
                    <ChatPanel
                        receivedChat={latestPost}
                        sendChat={this.sendChat} />
                </Row>
                </Grid>    
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