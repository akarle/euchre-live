import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';
import SeatPicker from './SeatPicker';
import MainHand from './MainHand';

export default class CardTable extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            playerNames: [],
            mySeat: -1,
            phase: 'lobby',
            left: { name: '', seat: -1 },
            partner: { name: '', seat: -1 },
            right: { name: '', seat: -1 },
            myCards: []
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
            this.gameStartSetup();
        }
        this.setState({
            phase: 'vote',
            myCards: msg.hand
        });
    };

    gameStartSetup = () => {
        const { playerNames, mySeat } = this.state;
        const leftSeat = (mySeat + 1) % 4;
        const partnerSeat = (mySeat + 2) % 4;
        const rightSeat = (mySeat + 3) % 4;
        this.setState ({
            left : {
                name: playerNames[leftSeat],
                seat: leftSeat
            },
            partner : {
                name: playerNames[partnerSeat],
                seat: partnerSeat
            },
            right : {
                name: playerNames[rightSeat],
                seat: rightSeat
            }
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
            action: 'start_game'
        }))
        console.log('start game, dealer = ', startDealer);
    };

    sendCard = (index) => {
        console.log('card click ', index);
    }

    render () {
        const { playerNames, mySeat, phase, left, partner, right, myCards } = this.state;
        const {name, tableName} = this.props;
        const showSeatPicker = phase == 'lobby';
        const showTrump = phase == 'vote';
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
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
                            <div className="player__name">{partner.name}</div>
                        </Column>
                        <Column className="tt__right" sm={1}>
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            <div className="player__name">{left.name}</div>
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
                        </Column>
                        <Column className="tm__right" sm={1}>
                            <div className="player__name">{right.name}</div>
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                        </Column>
                        <Column className="tb__center" sm={2}>
                            {!showSeatPicker && (
                                <MainHand
                                    cards={myCards}
                                    cardClick={this.sendCard}
                                />
                            )}
                        </Column>
                        <Column className="tb__right" sm={1}>
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