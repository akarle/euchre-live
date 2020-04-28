import React from 'react';
import PropTypes from 'prop-types';
import {Button, Dropdown} from 'carbon-components-react';

const remain = { //HDSC order by Game.pm
    H: ['Diamonds', 'Spades', 'Clubs'],
    D: ['Hearts', 'Spades', 'Clubs'],
    S: ['Hearts', 'Diamonds', 'Clubs'],
    C: ['Hearts', 'Diamonds', 'Spades']
}
//NB usage w subs: voteOptions.order(<suit>)
const voteOptions = {
    pass: {action: 'order', vote: 'pass'},
    order: suit => ({action: 'order', vote: suit, loner: 0}),
    alone: suit => ({action: 'order', vote: suit, loner: 1})
}

class TrumpPicker extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            suitPick: 'U'
        }
    };

    componentDidUpdate (prevProps) {
        const { trumpCard, phaseTwo } = this.props;
        if ((trumpCard != prevProps.trumpCard) || (phaseTwo != prevProps.phaseTwo)){
            this.setState ({
                suitPick: 'U'
            })
        }
    }

    suitChange = event => {
        const pick = event.selectedItem;
        this.setState({
            suitPick: pick.substring(0,1)
        });
    };


    render () {
        const { trumpCard, phaseTwo, myDeal, onlyAlone, noPick, handleVote } = this.props;
        const { suitPick } = this.state;
        const trumpSuit = trumpCard ? trumpCard.substring(1) : 'U';
        const orderLabel = myDeal ? 'Pick up' : 'Order';
        const aloneLabel = myDeal ? 'Pick, Alone' : 'Order, Alone';
        const pickerLabels = remain[trumpSuit];
        const voteSuit = phaseTwo ? suitPick : trumpSuit;
        const orderVote = voteOptions.order(voteSuit);
        const aloneVote = voteOptions.alone(voteSuit);
        const disableOrder = phaseTwo && suitPick == 'U';
        return (
            <div id="TrumpPicker" className="trump__picker">
                <div className="tp1__stack">
                    <Button
                        className="p1p__button"
                        kind="primary"
                        size="small"
                        onClick={()=>{handleVote(voteOptions.pass)}}
                        >Pass</Button> 
                    {phaseTwo && (
                        <Dropdown
                        id="trump__drop"
                        className="trump__drop"
                        label="Choose Suit..."
                        size="sm"
                        itemToElement={null}
                        items={pickerLabels}
                        onChange={(event)=>this.suitChange(event)}
                        />
                    )}
                    <Button
                        className="p1o__button"
                        kind="primary"
                        size="small"
                        disabled={disableOrder || onlyAlone || noPick}
                        onClick={()=>{handleVote(orderVote)}}
                        >{orderLabel}</Button> 
                    <Button
                        className="p1a__button"
                        kind="primary"
                        size="small"
                        disabled={disableOrder || noPick}
                        onClick={()=>{handleVote(aloneVote)}}
                        >{aloneLabel}</Button> 
                </div>
            </div>
        );
    }
}
TrumpPicker.propTypes = {
    trumpCard: PropTypes.string,
    phaseTwo: PropTypes.bool,
    myDeal: PropTypes.bool,
    onlyAlone: PropTypes.bool,
    noPick: PropTypes.bool,
    handleVote: PropTypes.func,
}
export default TrumpPicker;
