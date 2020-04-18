import React from 'react';
import PropTypes from 'prop-types';

class HiddenHand extends React.Component {

    cardBacks = (num) => {
        let cbacks = [];
        for (let i = 0; i < num; i++){
            cbacks.push(
                <div
                    key={i}
                    className="hid__card__div">
                        <img className="hid__card" src="cards/1B.svg" />
                </div>
            ); 
        }
        return cbacks;
    }

    render () {
        const { numCards } = this.props;
        const cardBacks = this.cardBacks(numCards);
        return (
            <div className="hid__card__row">
                {cardBacks}
            </div>
        );
    };
}
HiddenHand.propTypes = {
    numCards: PropTypes.number
}
export default HiddenHand;