const messagesList = document.getElementById("messagesList");
const messagesStatus = document.getElementById("messagesStatus");
let customerMessages = [];

async function loadCustomerMessages() {
    const admin = await protectAdminPage();

    if (!admin) {
        return;
    }

    try {
        const pageSize = 500;
        const loadedMessages = [];

        for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseClient
                .from("contact_messages")
                .select("id, name, email, phone, subject, message, is_read, created_at")
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .range(offset, offset + pageSize - 1);

            if (error) {
                throw error;
            }

            loadedMessages.push(...data);

            if (data.length < pageSize) {
                break;
            }
        }

        customerMessages = loadedMessages;
        renderCustomerMessages();
        messagesStatus.textContent = customerMessages.length
            ? `${customerMessages.length} message${customerMessages.length === 1 ? "" : "s"}`
            : "No customer messages yet.";
        messagesStatus.className = "message";
    } catch (error) {
        console.error("Could not load customer messages:", error);
        messagesStatus.textContent = "Customer messages could not be loaded. Please try again.";
        messagesStatus.className = "message error";
        messagesList.replaceChildren();
    }
}

function createMessageElement(message) {
    const article = document.createElement("article");
    const header = document.createElement("div");
    const sender = document.createElement("div");
    const senderName = document.createElement("h2");
    const date = document.createElement("time");
    const badge = document.createElement("span");
    const details = document.createElement("p");
    const subject = document.createElement("h3");
    const body = document.createElement("p");
    const actions = document.createElement("div");
    const toggleButton = document.createElement("button");

    article.className = message.is_read
        ? "message-card"
        : "message-card is-unread";
    header.className = "message-card-header";
    sender.className = "message-sender";
    senderName.textContent = message.name;
    date.dateTime = message.created_at;
    date.textContent = new Date(message.created_at).toLocaleString();
    badge.className = message.is_read ? "message-badge read" : "message-badge unread";
    badge.textContent = message.is_read ? "Read" : "Unread";

    const contactDetails = [message.email, message.phone]
        .filter(Boolean)
        .join(" · ");
    details.className = "message-contact";
    details.textContent = contactDetails;

    subject.className = "message-subject";
    subject.textContent = message.subject || "No subject";
    body.className = "message-body";
    body.textContent = message.message;
    actions.className = "message-actions";
    toggleButton.type = "button";
    toggleButton.className = "btn-secondary";
    toggleButton.dataset.messageId = message.id;
    toggleButton.dataset.action = "toggle-read";
    toggleButton.textContent = message.is_read ? "Mark unread" : "Mark read";
    toggleButton.setAttribute(
        "aria-label",
        `${message.is_read ? "Mark unread" : "Mark read"} message from ${message.name}`
    );

    sender.append(senderName, details);
    header.append(sender, date, badge);
    actions.appendChild(toggleButton);
    article.append(header, subject, body, actions);

    return article;
}

function renderCustomerMessages() {
    messagesList.replaceChildren();
    customerMessages.forEach(message => {
        messagesList.appendChild(createMessageElement(message));
    });
}

async function toggleMessageRead(messageId, button) {
    const message = customerMessages.find(item => item.id === messageId);

    if (!message || button.disabled) {
        return;
    }

    button.disabled = true;
    messagesStatus.textContent = "Updating message...";
    messagesStatus.className = "message";

    try {
        const { data, error } = await supabaseClient
            .from("contact_messages")
            .update({ is_read: !message.is_read })
            .eq("id", message.id)
            .select("id, is_read")
            .single();

        if (error) {
            throw error;
        }

        message.is_read = data.is_read;
        renderCustomerMessages();
        const unreadCount = customerMessages.filter(item => !item.is_read).length;
        messagesStatus.textContent =
            `${customerMessages.length} message${customerMessages.length === 1 ? "" : "s"} · ${unreadCount} unread`;
        messagesStatus.className = "message success";
    } catch (error) {
        console.error("Could not update message status:", error);
        messagesStatus.textContent = "The message status could not be updated. Please try again.";
        messagesStatus.className = "message error";
        button.disabled = false;
    }
}

messagesList.addEventListener("click", function(event) {
    const button = event.target.closest('button[data-action="toggle-read"]');

    if (button) {
        toggleMessageRead(button.dataset.messageId, button);
    }
});

loadCustomerMessages();
