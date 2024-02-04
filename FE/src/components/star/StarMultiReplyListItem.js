function StarMultiReplyListItem(props) {
  const reply = props.reply;

  return (
    <div className="star-reply-list-item" style={{ border: "1px solid black", margin: "5px", marginLeft: "15px" }}>
      <div style={{ display: "flex" }}>
        <div>{reply.userIndex}번 유저</div>
        <div>{reply.commentRegTime}</div>
      </div>
      <div style={{ display: "flex" }}>
        <div>{reply.commentContent}</div>
        <div>{/* <button onClick={handleDelete}>댓글 삭제</button> */}</div>
      </div>
    </div>
  );
}

export default StarMultiReplyListItem;
