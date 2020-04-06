import React from 'react';
import PropTypes from 'prop-types';
import {Button, Grid, Row, Column} from 'carbon-components-react';
import {Package32, Export32} from '@carbon/icons-react';

class SeatPicker extends React.Component {

    constructor(props) {
        super(props);
        //this.state - unneeded?
    }

    
    tableSeat = (name, index) => {
        const taken = name != 'Empty';
        const mine = index === this.props.mySeat;
        return (
            <div className="table__seat">
                {!taken && (
                <Button
                    className="sit__button"
                    kind="ghost"
                    onClick={()=>{this.props.handleSit(index)}}
                    renderIcon={Package32}>Choose seat</Button>
                )}
                {taken && (<span className="spName">{name}</span>)}
                {taken && mine && (
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
        const {names} = this.props;
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
            </div>
        )
    }
}
SeatPicker.propTypes = {
    mySeat: PropTypes.number,
    names: PropTypes.arrayOf(PropTypes.string),
    handleSit: PropTypes.func,
    handleStand: PropTypes.func
}
export default SeatPicker;
