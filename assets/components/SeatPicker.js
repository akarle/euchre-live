import React from 'react';
import PropTypes from 'prop-types';
import {Button, Grid, Row, Column, Dropdown} from 'carbon-components-react';
import {Package32, Export32, Play32} from '@carbon/icons-react';

class SeatPicker extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            startDealer: -2
        }
    };

    allSeated = names => {
        const matchIndex = names.findIndex(name => name == 'Empty');
        return matchIndex == -1;
    };

    dealerChange = (e) => {
        const { names } = this.props;
        const selectIndex = names.findIndex(name => e.selectedItem == name);
        this.setState({
            startDealer: selectIndex
        });
    };
    
    tableSeat = (name, index) => {
        const { amSpectator } = this.props;
        const taken = name != 'Empty';
        const mine = index === this.props.mySeat;
        const iAmSeated = -1 != this.props.mySeat;
        return (
            <div className="table__seat">
                {!taken && !iAmSeated && (
                <Button
                    className="sit__button"
                    kind="ghost"
                    onClick={()=>{this.props.handleSit(index)}}
                    renderIcon={Package32}>Choose seat</Button>
                )}
                {(taken || iAmSeated) && (<div className="spName">{name}</div>)}
                {taken && mine && !amSpectator && (
                    <Button
                    className="stand__button"
                    kind="ghost"
                    onClick={()=>{this.props.handleStand(index)}}
                    renderIcon={Export32}>Stand</Button> 
                )}
            </div>
        )
    }

    render () {
        const { names, amSpectator } = this.props;
        const { startDealer } = this.state;
        // if all seats taken but mine is not 0-3 then I'm a spectator
        const allSeated = !amSpectator && this.allSeated(names);
        const pickerNames = names.slice(0);
        pickerNames.unshift('Random');
        return (
            <div id="seatPicker" className="seat__picker">
                <Grid>
                    <Row className="sp__top">
                        {this.tableSeat(names[2], 2)}
                    </Row>
                    <Row className="sp__mid">
                        <Column className="spm__left">
                            {this.tableSeat(names[1], 1)}
                        </Column>
                        <Column className="spm__right">
                            {this.tableSeat(names[3], 3)}
                        </Column>
                    </Row>
                    <Row className="sp__bot">
                        {this.tableSeat(names[0], 0)}
                    </Row>
                </Grid>
                { allSeated && (
                <div id="startGame" className="start__game">
                    <Dropdown
                        id="dealer__drop"
                        className="dealer__drop"
                        label="Choose Dealer..."
                        size="xl"
                        itemToElement={null}
                        items={pickerNames}
                        onChange={(event)=>this.dealerChange(event)}
                    />
                    <Button
                    className="start__game__button"
                    hasIconOnly={true}
                    iconDescription="set name"
                    tooltipPosition="bottom"
                    disabled={startDealer < -1}
                    onClick={()=>{this.props.handleStart(startDealer)}}
                    renderIcon={Play32}>Play! </Button> 
                </div>
                )}
            </div>
        );
    }
}
SeatPicker.propTypes = {
    mySeat: PropTypes.number,
    names: PropTypes.arrayOf(PropTypes.string),
    amSpectator: PropTypes.bool,
    handleSit: PropTypes.func,
    handleStand: PropTypes.func,
    handleStart: PropTypes.func
}
export default SeatPicker;
