// 1. imports from unpkg.com
import * as Preact from 'https://unpkg.com/preact@10.4.7/dist/preact.module.js'
import htm from 'https://unpkg.com/htm@3.0.4/dist/htm.module.js'
// 2. make htm import work with Preact import
const html = htm.bind(Preact.createElement)

function parseJwt (token) {
	if(!token) return null;
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload).role;
};

// 5. define App component
class App extends Preact.Component {
	constructor() {
		super()
		this.state = { todos: [], text: '' };
	}

	fetchTasks(){
		fetch(window.postgrest_url + "?order=id.asc", {
			method: "GET",
			headers: {
				"Content-Type":"application/json",
				"Authorization": `Bearer ${window.postgrest_token}`,
			},
		}).then((resp) => {
			return resp.json();
		}).then((data) => {
			this.setState({todos: data});
		})
	}

	componentDidMount(){
		this.fetchTasks();
	}

	setText = e => {
		this.setState({ text: e.target.value });
	};

	login = e => {
		e.preventDefault();
		let token = document.getElementById('jwt').value;
		let loggedInRole = parseJwt(token);
		if(loggedInRole) {
			localStorage.setItem('postgrest_token', token);
			window.location.reload();
		}
	}

	logout = e => {
		localStorage.removeItem('postgrest_token');
		window.postgrest_token = null;
		window.location.reload();
	}

	addTodo = () => {
		let { todos, text } = this.state;
		if(text.trim().length == 0) return;

		// pure client-side operations
		// todos = todos.concat({ text: text, done: false });
		// this.setState({ todos: todos});
		// this.setState({ text: ''});

		let newTask = {name: text, done: false};

		fetch(window.postgrest_url, {
			method: "POST",
			headers: {
				"Content-Type":"application/json",
				"Accept": "application/json",
				"Authorization": `Bearer ${window.postgrest_token}`
			},
			body: JSON.stringify(newTask),
		}).then((resp) => {
			this.fetchTasks();
			this.setState({ text: ''});
		})

	};

	toggleDone = e => {
		let { todos, text } = this.state;
		let list = e.target.parentElement.parentElement.children;
		let index = Array.prototype.indexOf.call(list, e.target.parentElement);
		let task = todos[index];
		// todos[index].done = !todos[index].done;
		// this.setState({ todos: todos});

		fetch(window.postgrest_url + "?id=eq." + task.id, {
			method: "PATCH",
			headers: {
				"Content-Type":"application/json",
				"Accept": "application/json",
				"Authorization": `Bearer ${window.postgrest_token}`
			},
			body: JSON.stringify({done: !task.done}),
		}).then((resp) => {
			this.fetchTasks();
		})
	}

	removeTodo = e => {
		let { todos, text } = this.state;
		let list = e.target.parentElement.parentElement.children;
		let index = Array.prototype.indexOf.call(list, e.target.parentElement);
		let task = todos[index];

		// todos.splice(index, 1)
		// this.setState({ todos: todos});

		fetch(window.postgrest_url + "?id=eq." + task.id, {
			method: "DELETE",
			headers: {
				"Content-Type":"application/json",
				"Accept": "application/json",
				"Authorization": `Bearer ${window.postgrest_token}`
			},
		}).then((resp) => {
			this.fetchTasks();
		})
	}

	render() {
		const { page } = this.props
		const { todos, text } = this.state
		const loggedInRole = parseJwt(window.postgrest_token);
		return html`
		
		<div class="app bg-white rounded-xl shadow p-6 mt-4 mx-auto max-w-lg">
			
			${loggedInRole ? 
			html`<div class="flex mb-8">
			<div class="flex-grow">You're logged in as: <span class="font-bold">${loggedInRole}</span></div>
			<button onClick=${this.logout} class="px-2 py-1 border-1 rounded text-white bg-blue-500">Logout</button>
			</div>`
			:
			html`<form onSubmit=${this.login} action="javascript:" class="w-full inline-flex mb-8">
			<input type="text" autocomplete="off" id="jwt" placeholder="paste your JWT token here" class="shadow appearance-none border rounded flex-grow py-2 px-3 mr-4 text-grey-darker"/>
			<button type="submit" class="px-2 py-1 border-1 rounded text-white bg-blue-500 hover:bg-blue-600">Login</button>
			</form>`}

			<form onSubmit=${this.addTodo} action="javascript:" class="flex mb-4">
			<input placeholder="What do you want to do?" type="text" value=${text} onInput=${this.setText} class="shadow appearance-none border rounded flex-grow py-2 px-3 mr-4 text-grey-darker"/>
			<button type="submit" class="p-2 border-2 rounded text-purple-500 border-purple-500 hover:text-white hover:bg-purple-500">Add Todo</button>
			</form>

			<div>
			${todos.map(todo => html`
				<div key="${todo}" class="flex mb-4 items-center">
				<input type="checkbox" checked=${todo.done} onClick=${this.toggleDone} class="flex-no-shrink p-2 ml-4 mr-2 border-2 rounded hover:text-white text-green border-green hover:bg-green-500">${todo.done}</button>
				<p class="w-full ${todo.done? 'line-through text-green' : 'text-grey-900'}">
				<span class="px-2 py-1 text-black bg-gray-300 mr-2">${todo.owner}</span>
				${todo.name}
				</p>
				<button onClick=${this.removeTodo} class="flex-no-shrink p-2 ml-2 border-2 rounded text-red border-red hover:text-white hover:bg-red-500">Remove</button>
				</div>
			`)}
			</div>
		</div>
		`
	}
}
// 6. append rendered App component to node document.body
Preact.render(html`<${App} page="All"></App>`, document.body)