import React, { Component, createRef } from 'react';

export default class Test extends Component {
  myref = createRef<HTMLInputElement>();
  handelClick = () => {
    const newlist = [...this.state.mylist];
    newlist.push(this.myref.current.value);
    this.setState({
      mylist: newlist,
    });
  };
  handeldel = (index: number) => {
    const newlist = [...this.state.mylist];
    newlist.splice(index, 1);
    this.setState({
      mylist: newlist,
    });
  };
  state = {
    mylist: [
      {
        id: 1,
        text: 'aaa',
      },
      {
        id: 2,
        text: 'bbb',
      },
      {
        id: 3,
        text: 'ccc',
      },
    ],
  };
  render() {
    return (
      <div>
        <input type="text" ref={this.myref} className="border-5" />
        <button onClick={() => this.handelClick()}>add</button>
        <ul>
          {this.state.mylist.map((item, index) => (
            <li key={item.id}>
              {item.text}
              <button onClick={() => this.handeldel(index)}>del</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
