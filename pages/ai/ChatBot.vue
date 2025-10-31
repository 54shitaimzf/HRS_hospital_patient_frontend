<template>
	<view class="chat-container">
		<!-- 聊天内容 -->
		<scroll-view scroll-y class="chat-content" :scroll-into-view="scrollTo">
			<view v-for="(msg, index) in messages" :key="index" :id="'msg-' + index" class="message" :class="msg.from">
				<view class="bubble">{{ msg.text }}</view>
			</view>
		</scroll-view>

		<!-- 底部输入栏 -->
		<view class="chat-input-area">
			<input v-model="inputText" class="chat-input" placeholder="请输入您的症状或问题..." confirm-type="send"
				@confirm="sendMessage" />
			<button type="primary" size="small" @click="sendMessage">发送</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		nextTick
	} from "vue";

	const messages = ref([{
		from: "bot",
		text: "您好，我是您的健康问诊助手，请简要描述您的症状。"
	}, ]);
	const inputText = ref("");
	const scrollTo = ref("");

	const simulateStreamResponse = async (fullText) => {
		let displayedText = "";
		messages.value.push({
			from: "bot",
			text: displayedText
		});
		const index = messages.value.length - 1;

		for (let i = 0; i < fullText.length; i++) {
			displayedText += fullText[i];
			messages.value[index].text = displayedText;
			scrollTo.value = "msg-" + index;
			await new Promise((resolve) => setTimeout(resolve, 40)); // 40ms/char 打字效果
		}
		// 最终滚动到底部
		nextTick(() => {
			scrollTo.value = "msg-" + index;
		});
	};

	const sendMessage = () => {
		if (!inputText.value.trim()) return;

		// 用户消息
		messages.value.push({
			from: "user",
			text: inputText.value
		});
		const question = inputText.value;
		inputText.value = "";

		// 滚动到底部显示用户消息
		nextTick(() => {
			scrollTo.value = "msg-" + (messages.value.length - 1);
		});

		// 模拟AI回答（替换成接口请求即可）
		setTimeout(() => {
			const answer =
				"根据您描述的症状，建议多休息，保持水分。如有严重不适，请及时就医。";
			simulateStreamResponse(answer);
		}, 300);
	};

	const goBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #f5f7fa;
	}

	.chat-content {
		flex: 1;
		padding: 30rpx 20rpx;
		overflow-y: auto;
		box-sizing: border-box;
	}

	.message {
		display: flex;
		margin-bottom: 20rpx;
	}

	.message.user {
		display: flex;
		justify-content: flex-end;
		padding-left: 20rpx;
		padding-right: 0;
	}

	.message.bot {
		justify-content: flex-start;
		padding-right: 10rpx;
	}

	.bubble {
		max-width: 75%;
		padding: 20rpx 28rpx;
		border-radius: 24rpx;
		font-size: 28rpx;
		line-height: 1.6;
		word-break: break-word;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}

	.message.user .bubble {
		background-color: #3b82f6;
		color: white;
		border-top-right-radius: 0;
	}

	.message.bot .bubble {
		background-color: #fff;
		color: #333;
		border-top-left-radius: 0;
	}


	.chat-input-area {
		padding: 20rpx;
		display: flex;
		background-color: #ffffff;
		border-top: 1px solid #eee;
		align-items: center;
		gap: 20rpx;
	}

	.chat-input {
		flex: 1;
		background-color: #f0f2f5;
		border-radius: 100rpx;
		padding: 20rpx 30rpx;
		font-size: 28rpx;
	}
</style>