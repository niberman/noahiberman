import ollama

def chat():
    print("\n[SYSTEM] iNoah Digital Twin Online. (Type 'exit' to quit)\n")
    
    # Keep history so it remembers the conversation context
    history = []

    while True:
        user_input = input("You > ")
        if user_input.lower() in ["exit", "quit"]:
            break

        # Add user input to history
        history.append({'role': 'user', 'content': user_input})

        # Generate response using YOUR custom model
        response = ollama.chat(model='inoah', messages=history)
        
        bot_reply = response['message']['content']
        print(f"iNoah > {bot_reply}\n")

        # Add bot reply to history
        history.append({'role': 'assistant', 'content': bot_reply})

if __name__ == "__main__":
    chat()
