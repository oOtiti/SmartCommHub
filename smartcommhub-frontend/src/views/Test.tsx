import { Component, createRef } from 'react';

interface Item { id: number; text: string; }
interface State { mylist: Item[]; }

export default class Test extends Component<{}, State> {
  myref = createRef<HTMLInputElement>();
  handelClick = () => {
    const value = this.myref.current?.value ?? '';
    const text = value.trim();
    if (!text) return;
    const newlist = [...this.state.mylist];
    if (this.myref.current) {
        newlist.push({
            id: Date.now(),
            text: this.myref.current.value
        });
        this.setState({
          mylist: newlist,
        });
        this.myref.current.value = '';
    }
  };
  handeldel = (index: number) => {
    const newlist = [...this.state.mylist];
    newlist.splice(index, 1);
    this.setState({
      mylist: newlist,
    });
  };
  state: State = {
    mylist: [
      { id: 1, text: 'aaa' },
      { id: 2, text: 'bbb' },
      { id: 3, text: 'ccc' },
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
