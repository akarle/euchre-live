import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';
import SeatPicker from './SeatPicker';
import MainHand from './MainHand';
import HiddenHand from './HiddenHand';

const trumpPlacement = ['me', 'left', 'partner', 'right'];

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
            left: { name: '', seat: -1, handInfo: '', turnInfo: ' ' },
            partner: { name: '', seat: -1, handInfo: '', turnInfo: ' ' },
            right: { name: '', seat: -1, handInfo: '', turnInfo: '' },
            trumpPlace: '',
            trumpNom: ''
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
        }
        this.setState({
            phase: 'vote',
            myCards: msg.hand
        });
    };

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
            left : {
                name: playerNames[leftSeat],
                seat: leftSeat,
                handInfo: handInfo[leftSeat],
                turnInfo: turnInfo[leftSeat]
            },
            partner : {
                name: playerNames[partnerSeat],
                seat: partnerSeat,
                handInfo: handInfo[partnerSeat],
                turnInfo: turnInfo[partnerSeat]
            },
            right : {
                name: playerNames[rightSeat],
                seat: rightSeat,
                handInfo: handInfo[rightSeat],
                turnInfo: turnInfo[rightSeat]
            },
            myHandInfo : handInfo[mySeat],
            myTurnInfo : turnInfo[mySeat],
            trumpPlace : trumpPlace,
            trumpNom: msg.game.trump_nominee
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
        }))
        console.log('start game, dealer = ', startDealer);
    };

    sendCard = (index) => {
        console.log('card click ', index);
    }

    render () {
        const { playerNames, mySeat, phase, left, partner, right, myCards,
                myHandInfo, myTurnInfo, trumpPlace, trumpNom } = this.state;
        const {name, tableName} = this.props;
        const showSeatPicker = phase == 'lobby';
        const showTrump = phase == 'vote';
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        const tcp = "trump__holder " + trumpPlace;
        const trumpImage = 'cards/' + trumpNom + '.svg';
        return (
            <div id="table">
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
                                <div className="player__name">{partner.name}</div>
                                <div className="partner__info">
                                    <div className="play__hinfo">{partner.handInfo}</div>
                                    <div className="play__tinfo">{partner.turnInfo}</div>
                                </div>
                                <HiddenHand
                                    numCards={5} />
                            </div>)}
                        </Column>
                        <Column className="tt__right" sm={1}>
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{left.name}</div>
                                <div className="play__hinfo">{left.handInfo}</div>
                                <div className="play__tinfo">{left.turnInfo}</div>
                                <HiddenHand
                                    numCards={5} />
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
                        </Column>
                        <Column className="tm__right" sm={1}>
                            {!showSeatPicker && (
                            <div className="vert__stack">
                                <div className="player__name">{right.name}</div>
                                <div className="play__hinfo">{right.handInfo}</div>
                                <div className="play__tinfo">{right.turnInfo}</div>
                                <HiddenHand
                                    numCards={5} />
                            </div>)}
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                            {!showSeatPicker && (
                                <div className="my__stack">
                                    <div className="my__hinfo">You: {myHandInfo}</div>
                                    <div className="my__tinfo">{myTurnInfo}</div>
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
                        {/* <Column className="tb__right" sm={1}>
                        </Column> */}
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