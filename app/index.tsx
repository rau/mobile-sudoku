import { useState, useEffect } from "react"
import {
	Text,
	View,
	StyleSheet,
	Pressable,
	Platform,
	ActionSheetIOS,
	StatusBar,
} from "react-native"
import { Menu } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { generateSudoku } from "./utils/sudoku"
import { calculateCandidates } from "./utils/sudoku"

type CellState = {
	value: number | null
	isFixed: boolean
	candidates: Set<number>
	removedCandidates: Set<number>
	hasConflict: boolean
	checked: boolean
}

export function findHintCell(board: CellState[][]): [number, number] | null {
	// First, look for naked singles
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (board[row][col].value === null) {
				const candidates = calculateCandidates(board, row, col)
				if (candidates.size === 1) {
					return [row, col] // Found a naked single
				}
			}
		}
	}

	// Then, look for hidden singles
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (board[row][col].value !== null) continue

			const candidates = calculateCandidates(board, row, col)
			if (candidates.size === 0) continue

			// Check if any candidate is unique in row
			for (const candidate of Array.from(candidates)) {
				let isUniqueInRow = true
				for (let c = 0; c < 9; c++) {
					if (c !== col && board[row][c].value === null) {
						const otherCandidates = calculateCandidates(
							board,
							row,
							c
						)
						if (otherCandidates.has(candidate)) {
							isUniqueInRow = false
							break
						}
					}
				}
				if (isUniqueInRow) return [row, col]

				// Check if candidate is unique in column
				let isUniqueInCol = true
				for (let r = 0; r < 9; r++) {
					if (r !== row && board[r][col].value === null) {
						const otherCandidates = calculateCandidates(
							board,
							r,
							col
						)
						if (otherCandidates.has(candidate)) {
							isUniqueInCol = false
							break
						}
					}
				}
				if (isUniqueInCol) return [row, col]

				// Check if candidate is unique in box
				let isUniqueInBox = true
				const boxRow = Math.floor(row / 3) * 3
				const boxCol = Math.floor(col / 3) * 3
				for (let r = boxRow; r < boxRow + 3; r++) {
					for (let c = boxCol; c < boxCol + 3; c++) {
						if (
							(r !== row || c !== col) &&
							board[r][c].value === null
						) {
							const otherCandidates = calculateCandidates(
								board,
								r,
								c
							)
							if (otherCandidates.has(candidate)) {
								isUniqueInBox = false
								break
							}
						}
					}
					if (!isUniqueInBox) break
				}
				if (isUniqueInBox) return [row, col]
			}
		}
	}

	// If no singles found, return cell with fewest candidates
	let cellWithFewestCandidates: [number, number] | null = null
	let minCandidates = 10

	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (board[row][col].value === null) {
				const candidates = calculateCandidates(board, row, col)
				if (candidates.size > 0 && candidates.size < minCandidates) {
					minCandidates = candidates.size
					cellWithFewestCandidates = [row, col]
				}
			}
		}
	}

	return cellWithFewestCandidates
}

export default function Index() {
	const [board, setBoard] = useState<CellState[][]>(
		Array(9)
			.fill(null)
			.map(() =>
				Array(9)
					.fill(null)
					.map(() => ({
						value: null,
						isFixed: false,
						candidates: new Set<number>(),
						removedCandidates: new Set<number>(),
						hasConflict: false,
						checked: false,
					}))
			)
	)
	const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
		null
	)
	const [solution, setSolution] = useState<number[][]>([])
	const [inputMode, setInputMode] = useState<"normal" | "candidate">("normal")
	const [autoCandidate, setAutoCandidate] = useState(false)
	const [menuVisible, setMenuVisible] = useState(false)
	const [newGameMenuVisible, setNewGameMenuVisible] = useState(false)

	useEffect(() => {
		startNewGame("hard")
	}, [])

	const startNewGame = (difficulty: "easy" | "medium" | "hard") => {
		const { puzzle, solution } = generateSudoku(difficulty)
		setSolution(solution)
		const newBoard = puzzle.map((row) =>
			row.map((num) => ({
				value: num === 0 ? null : num,
				isFixed: num !== 0,
				candidates: new Set<number>(),
				removedCandidates: new Set<number>(),
				hasConflict: false,
				checked: false,
			}))
		)
		setBoard(newBoard)

		// Find first available cell
		let foundCell = false
		for (let i = 0; i < 9 && !foundCell; i++) {
			for (let j = 0; j < 9 && !foundCell; j++) {
				if (!newBoard[i][j].isFixed) {
					setSelectedCell([i, j])
					foundCell = true
				}
			}
		}
	}

	const handleNumberInput = (
		num: number | null,
		row: number,
		col: number
	) => {
		const cell = board[row][col]
		if (cell.isFixed) return

		const newBoard = [...board]

		if (inputMode === "normal") {
			if (num === null) {
				newBoard[row][col] = {
					...cell,
					value: null,
					candidates: new Set<number>(),
				}
			} else {
				newBoard[row][col] = {
					...cell,
					value: num,
					candidates: new Set<number>(),
				}
			}

			if (autoCandidate) {
				// Update candidates for affected cells
				for (let i = 0; i < 9; i++) {
					// Update row
					if (i !== col) {
						newBoard[row][i].candidates = calculateCandidates(
							newBoard,
							row,
							i
						)
					}
					// Update column
					if (i !== row) {
						newBoard[i][col].candidates = calculateCandidates(
							newBoard,
							i,
							col
						)
					}
				}
				// Update box
				const boxRow = Math.floor(row / 3) * 3
				const boxCol = Math.floor(col / 3) * 3
				for (let i = 0; i < 3; i++) {
					for (let j = 0; j < 3; j++) {
						const r = boxRow + i
						const c = boxCol + j
						if (r !== row || c !== col) {
							newBoard[r][c].candidates = calculateCandidates(
								newBoard,
								r,
								c
							)
						}
					}
				}
			}
		} else {
			// Candidate mode
			if (num === null) {
				newBoard[row][col] = {
					...cell,
					candidates: new Set<number>(),
				}
			} else {
				const newCandidates = new Set(cell.candidates)
				if (newCandidates.has(num)) {
					newCandidates.delete(num)
				} else {
					newCandidates.add(num)
				}
				newBoard[row][col] = {
					...cell,
					candidates: newCandidates,
				}
			}
		}

		setBoard(newBoard)
	}

	const handleAutoCandidateToggle = (checked: boolean) => {
		setAutoCandidate(checked)
		if (checked) {
			setBoard(
				board.map((row, i) =>
					row.map((cell, j) => ({
						...cell,
						candidates: calculateCandidates(board, i, j),
					}))
				)
			)
		} else {
			setBoard(
				board.map((row) =>
					row.map((cell) => ({
						...cell,
						candidates: new Set<number>(),
					}))
				)
			)
		}
	}

	const handleHint = () => {
		const hintCell = findHintCell(board)
		if (hintCell) {
			setSelectedCell(hintCell)
		}
	}

	const handleMenuPress = () => {
		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ["Cancel", "Hint"],
					cancelButtonIndex: 0,
				},
				(buttonIndex) => {
					if (buttonIndex === 1) {
						handleHint()
					}
				}
			)
		} else {
			setMenuVisible(true)
		}
	}

	const handleNewGamePress = () => {
		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ["Cancel", "Easy", "Medium", "Hard"],
					cancelButtonIndex: 0,
				},
				(buttonIndex) => {
					if (buttonIndex === 1) startNewGame("easy")
					if (buttonIndex === 2) startNewGame("medium")
					if (buttonIndex === 3) startNewGame("hard")
				}
			)
		} else {
			setNewGameMenuVisible(true)
		}
	}

	const renderCell = (cell: CellState, i: number, j: number) => {
		const isSelected = selectedCell?.[0] === i && selectedCell?.[1] === j

		// Calculate border styles
		const borderStyles = {
			// Outer borders of the 9x9 grid
			borderTopWidth: i === 0 ? 1.5 : 0,
			borderLeftWidth: j === 0 ? 1.5 : 0,
			borderRightWidth: j === 8 ? 1.5 : 0,
			borderBottomWidth: i === 8 ? 1.5 : 0,
			// Inner borders (3x3 box divisions)
			borderTopWidth2: i % 3 === 0 && i !== 0 ? 1 : 0.5,
			borderLeftWidth2: j % 3 === 0 && j !== 0 ? 1 : 0.5,
			borderRightWidth2: (j + 1) % 3 === 0 && j !== 8 ? 1 : 0.5,
			borderBottomWidth2: (i + 1) % 3 === 0 && i !== 8 ? 1 : 0.5,
			// Colors
			borderColor: "#121212",
			borderTopColor: i === 0 ? "#121212" : i % 3 === 0 ? "#666" : "#888",
			borderLeftColor:
				j === 0 ? "#121212" : j % 3 === 0 ? "#666" : "#888",
			borderRightColor:
				j === 8 ? "#121212" : (j + 1) % 3 === 0 ? "#666" : "#888",
			borderBottomColor:
				i === 8 ? "#121212" : (i + 1) % 3 === 0 ? "#666" : "#888",
		}

		return (
			<Pressable
				key={`${i}-${j}`}
				style={[
					styles.cell,
					{
						borderTopWidth:
							borderStyles.borderTopWidth ||
							borderStyles.borderTopWidth2,
						borderLeftWidth:
							borderStyles.borderLeftWidth ||
							borderStyles.borderLeftWidth2,
						borderRightWidth:
							borderStyles.borderRightWidth ||
							borderStyles.borderRightWidth2,
						borderBottomWidth:
							borderStyles.borderBottomWidth ||
							borderStyles.borderBottomWidth2,
						borderTopColor: borderStyles.borderTopColor,
						borderLeftColor: borderStyles.borderLeftColor,
						borderRightColor: borderStyles.borderRightColor,
						borderBottomColor: borderStyles.borderBottomColor,
					},
					isSelected ? styles.selectedCell : null,
					cell.isFixed ? styles.fixedCell : null,
				]}
				onPress={() => setSelectedCell([i, j])}
			>
				{cell.value ? (
					<Text style={styles.cellText}>{cell.value}</Text>
				) : (
					<View style={styles.candidatesContainer}>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
							<Text
								key={num}
								style={[
									styles.candidateText,
									!cell.candidates.has(num) &&
										styles.hiddenCandidate,
								]}
							>
								{num}
							</Text>
						))}
					</View>
				)}
			</Pressable>
		)
	}

	return (
		<View style={styles.container}>
			<StatusBar barStyle="dark-content" />
			<View style={styles.header}>
				<View style={styles.headerButtons}>
					{Platform.OS === "ios" ? (
						<Pressable
							style={styles.menuButton}
							onPress={handleMenuPress}
						>
							<Text style={styles.menuButtonText}>...</Text>
						</Pressable>
					) : (
						<Menu
							visible={menuVisible}
							onDismiss={() => setMenuVisible(false)}
							anchor={
								<Pressable
									style={styles.menuButton}
									onPress={() => setMenuVisible(true)}
								>
									<Text style={styles.menuButtonText}>
										...
									</Text>
								</Pressable>
							}
							contentStyle={[styles.menuContent, { right: 80 }]}
						>
							<Menu.Item
								onPress={() => {
									setMenuVisible(false)
									handleHint()
								}}
								title="Hint"
							/>
						</Menu>
					)}
					{Platform.OS === "ios" ? (
						<Pressable
							style={styles.menuButton}
							onPress={handleNewGamePress}
						>
							<Text style={styles.menuButtonText}>+</Text>
						</Pressable>
					) : (
						<Menu
							visible={newGameMenuVisible}
							onDismiss={() => setNewGameMenuVisible(false)}
							anchor={
								<Pressable
									style={styles.menuButton}
									onPress={() => setNewGameMenuVisible(true)}
								>
									<Text style={styles.menuButtonText}>+</Text>
								</Pressable>
							}
							contentStyle={[styles.menuContent, { right: 40 }]}
						>
							<Menu.Item
								onPress={() => {
									setNewGameMenuVisible(false)
									startNewGame("easy")
								}}
								title="Easy"
							/>
							<Menu.Item
								onPress={() => {
									setNewGameMenuVisible(false)
									startNewGame("medium")
								}}
								title="Medium"
							/>
							<Menu.Item
								onPress={() => {
									setNewGameMenuVisible(false)
									startNewGame("hard")
								}}
								title="Hard"
							/>
						</Menu>
					)}
					<Pressable style={styles.menuButton}>
						<Ionicons
							name="settings-outline"
							size={24}
							color="black"
						/>
					</Pressable>
				</View>
			</View>

			{/* Sudoku Grid */}
			<View style={styles.grid}>
				{board.map((row, i) =>
					row.map((cell, j) => renderCell(cell, i, j))
				)}
			</View>

			{/* Number Input Controls */}
			<View style={styles.controls}>
				{/* Auto Candidate Checkbox */}
				<Pressable
					style={styles.checkboxContainer}
					onPress={() => handleAutoCandidateToggle(!autoCandidate)}
				>
					<View
						style={[
							styles.checkbox,
							autoCandidate && styles.checkboxChecked,
						]}
					>
						{autoCandidate && (
							<Text style={styles.checkmark}>✓</Text>
						)}
					</View>
					<Text style={styles.checkboxLabel}>
						Auto Candidate Mode
					</Text>
				</Pressable>

				{/* Mode Toggle Buttons */}
				<View style={styles.modeToggleContainer}>
					<Pressable
						style={[
							styles.modeButton,
							styles.modeButtonLeft,
							inputMode === "normal" && styles.modeButtonActive,
						]}
						onPress={() => setInputMode("normal")}
					>
						<Text
							style={[
								styles.modeButtonText,
								inputMode === "normal" &&
									styles.modeButtonTextActive,
							]}
						>
							Normal
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.modeButton,
							styles.modeButtonRight,
							inputMode === "candidate" &&
								styles.modeButtonActive,
						]}
						onPress={() => setInputMode("candidate")}
					>
						<Text
							style={[
								styles.modeButtonText,
								inputMode === "candidate" &&
									styles.modeButtonTextActive,
							]}
						>
							Candidate
						</Text>
					</Pressable>
				</View>

				{/* Number Pad */}
				<View style={styles.numberPad}>
					<View style={styles.numberRow}>
						{[1, 2, 3, 4, 5].map((num) => (
							<Pressable
								key={num}
								style={styles.numberButton}
								onPress={() => {
									if (!selectedCell) return
									handleNumberInput(
										num,
										selectedCell[0],
										selectedCell[1]
									)
								}}
							>
								<Text style={styles.numberButtonText}>
									{num}
								</Text>
							</Pressable>
						))}
					</View>
					<View style={styles.numberRow}>
						{[6, 7, 8, 9].map((num) => (
							<Pressable
								key={num}
								style={styles.numberButton}
								onPress={() => {
									if (!selectedCell) return
									handleNumberInput(
										num,
										selectedCell[0],
										selectedCell[1]
									)
								}}
							>
								<Text style={styles.numberButtonText}>
									{num}
								</Text>
							</Pressable>
						))}
						<Pressable
							style={styles.numberButton}
							onPress={() => {
								if (!selectedCell) return
								handleNumberInput(
									null,
									selectedCell[0],
									selectedCell[1]
								)
							}}
						>
							<Text style={styles.numberButtonText}>×</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "white",
		padding: 20,
		paddingTop: Platform.OS === "ios" ? 60 : 40,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		width: "100%",
		aspectRatio: 1,
		backgroundColor: "#121212",
		padding: 0.3,
		maxWidth: 400,
	},
	cell: {
		width: "11.11%", // 100% / 9
		aspectRatio: 1,
		backgroundColor: "white",
		alignItems: "center",
		justifyContent: "center",
		padding: 2,
	},
	cellText: {
		fontSize: 24,
		fontWeight: "bold",
	},
	selectedCell: {
		backgroundColor: "#F8CD07",
	},
	fixedCell: {
		backgroundColor: "#DFDFDF",
	},
	thickBorderTop: {
		borderTopWidth: 2,
		borderTopColor: "#121212",
	},
	thickBorderLeft: {
		borderLeftWidth: 2,
		borderLeftColor: "#121212",
	},
	controls: {
		width: "100%",
		maxWidth: 400,
		marginTop: 20,
	},
	modeToggleContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 16,
		width: "100%",
		maxWidth: 300,
		alignSelf: "center",
	},
	modeButton: {
		flex: 1,
		paddingVertical: 12,
		alignItems: "center",
		backgroundColor: "#f5f5f5",
		borderWidth: 1,
		borderColor: "#000",
	},
	modeButtonLeft: {
		borderTopLeftRadius: 4,
		borderBottomLeftRadius: 4,
		borderRightWidth: 0,
	},
	modeButtonRight: {
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
		borderLeftWidth: 0,
	},
	modeButtonActive: {
		backgroundColor: "#000",
	},
	modeButtonText: {
		fontSize: 16,
		fontWeight: "500",
		color: "#000",
	},
	modeButtonTextActive: {
		color: "#fff",
	},
	checkboxContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderWidth: 2,
		borderColor: "black",
		borderRadius: 4,
		marginRight: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: {
		backgroundColor: "#fff",
	},
	checkmark: {
		color: "#000",
		fontSize: 16,
		fontWeight: "bold",
	},
	checkboxLabel: {
		color: "black",
		fontSize: 16,
	},
	numberPad: {
		width: "100%",
		maxWidth: 400,
		gap: 8,
	},
	numberRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
		marginBottom: 8,
	},
	numberButton: {
		width: 60,
		height: 40,
		backgroundColor: "#E5E5E5",
		borderRadius: 4,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#000",
	},
	numberButtonText: {
		fontSize: 20,
		fontWeight: "500",
		color: "#000",
	},
	candidatesContainer: {
		flex: 1,
		flexDirection: "row",
		flexWrap: "wrap",
		width: "100%",
		height: "100%",
		padding: 2,
	},
	candidateText: {
		width: "33.33%",
		height: "33.33%",
		textAlign: "center",
		fontSize: 10,
		fontWeight: "300",
		color: "#bbb",
		paddingTop: 1,
	},
	hiddenCandidate: {
		opacity: 0,
	},
	header: {
		width: "100%",
		flexDirection: "row",
		justifyContent: "flex-end",
		alignItems: "center",
		marginBottom: 20,
	},
	headerButtons: {
		flexDirection: "row",
		gap: 2,
	},
	menuButton: {
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		transform: [{ rotate: "90deg" }],
	},
	menuContent: {
		backgroundColor: "white",
		borderRadius: 8,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		position: "absolute",
		top: 40,
	},
	menuButtonText: {
		color: "black",
		fontSize: 24,
		fontWeight: "bold",
		lineHeight: 18,
	},
	hintedCell: {
		backgroundColor: "#90EE90", // Light green to indicate hint
	},
})
