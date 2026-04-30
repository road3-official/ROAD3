function Avatar({ name, image, size = 40 }) {
  if (image) {
    return (
      <img
        src={image}
        alt="avatar"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ff7a00",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
      }}
    >
      {(name || "?").charAt(0)}
    </div>
  );
}

export default Avatar;