import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Logout32} from '@carbon/icons-react';
import SeatPicker from './SeatPicker';

export default class CardTable extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            playerNames: [],
            mySeat: -1
        };
    };

    componentDidMount () {
        const websoc = this.props.client;
        websoc.onmessage = (event) => this.processResponse(event);
    };

    processResponse = (event) => {
        let msg = JSON.parse(event.data);
        console.log(msg);
        if ('game_state' == msg.msg_type) {
            if ('lobby' == msg.game.phase){
                this.processLobby(msg);
            }
        };
    };

    processLobby = (msg) => {
        if (msg && msg.game && msg.game.players) {
            const plAr = msg.game.players;
            const mySeat = plAr.findIndex( x => x == this.props.name );
            this.setState({
                playerNames: plAr,
                mySeat: mySeat
            })
        };
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

    render () {
        const { playerNames, mySeat } = this.state;
        const {name, tableName} = this.props;
        const welcomeMsg = 'Welcome to the ' + tableName + ' table, ' + name + '!';
        return (
            <div id="table">
                <Grid>
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
                    <Row className="table__top">
                        <Column className="tt__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tt__center" sm={2}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tt__right" sm={1}>
                            <div>yo!</div>
                        </Column>
                    </Row>
                    <Row className="table__mid">
                        <Column className="tm__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tm__center" sm={2}>
                            {/* <div>yo!</div> */}
                            <SeatPicker
                                names={playerNames}
                                handleSit={this.sendSit}
                                handleStand={this.sendStand}
                                mySeat={mySeat}
                            />
                        </Column>
                        <Column className="tm__right" sm={1}>
                            <div>yo!</div>
                        </Column>
                    </Row>
                    <Row className="table__bot">
                        <Column className="tb__left" sm={1}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tb__center" sm={2}>
                            <div>yo!</div>
                        </Column>
                        <Column className="tb__right" sm={1}>
                            <div>yo!</div>
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